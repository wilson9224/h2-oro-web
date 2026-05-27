'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, CheckCircle, XCircle, Scale, User, Calendar, Camera, AlertCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface ModalFinishWorkProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FinishWorkData) => Promise<void>;
  orderId: string;
  currentCycle: {
    id: string;
    totalMetalWeightGr?: number;
    metalDeliveredGr?: number;
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
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
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

  const responsibleUsers = useMemo(() => {
    if (!currentUser) return users;
    if (users.some(user => user.id === currentUser.id)) return users;

    return [
      {
        id: currentUser.id,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
      },
      ...users,
    ];
  }, [currentUser, users]);

  useEffect(() => {
    if (!isOpen || !currentUser?.id) return;
    setFormData(prev => ({
      ...prev,
      qcByUserId: currentUser.id,
      workReceivedByUserId: currentUser.id,
    }));
  }, [isOpen, currentUser?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const effectiveQcByUserId = isAdmin
        ? formData.qcByUserId
        : currentUser?.id ?? formData.qcByUserId;
      const effectiveWorkReceivedByUserId = isAdmin
        ? formData.workReceivedByUserId
        : currentUser?.id ?? formData.workReceivedByUserId;

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
      
      if (!effectiveQcByUserId) {
        throw new Error('Debe seleccionar quién realiza el control de calidad');
      }
      
      if (!effectiveWorkReceivedByUserId) {
        throw new Error('Debe seleccionar quién recibe el trabajo');
      }

      await onSubmit({
        ...formData,
        qcByUserId: effectiveQcByUserId,
        workReceivedByUserId: effectiveWorkReceivedByUserId,
      });
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

  const qualityControllers = responsibleUsers;
  const deliveredGr = currentCycle.metalDeliveredGr ?? currentCycle.totalMetalWeightGr ?? 0;
  const materialDifference = deliveredGr > 0 ? formData.finalWeightGr - deliveredGr : 0;
  const surplusGr = deliveredGr > 0 ? deliveredGr - formData.finalWeightGr - (formData.returnedMaterialGr || 0) : 0;
  const isApproved = formData.qcResult === 'approved';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(10,10,10,0.88)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl my-auto rounded-2xl font-sans-custom flex flex-col"
        style={{
          background: 'rgba(18,16,14,0.98)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          maxHeight: 'calc(100vh - 2rem)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <CheckCircle size={15} style={{ color: 'rgba(212,175,55,0.8)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'rgba(242,240,237,0.88)' }}>Finalizar Trabajo</p>
              <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: 'rgba(242,240,237,0.3)' }}>Fase 3 — Control de Calidad y Entrega</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.5)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body — scrollable */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-5 py-4 space-y-5">

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: 'rgba(252,165,165,0.8)' }} />
                <p className="text-xs" style={{ color: 'rgba(252,165,165,0.85)' }}>{error}</p>
              </div>
            )}

            {/* Resultado del trabajo */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgba(212,175,55,0.6)' }}>
                <Scale size={11} /> Resultado del Trabajo
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Peso final de la joya (gr) *</label>
                  <input type="number" step="0.01" min="0.01" value={formData.finalWeightGr} onChange={(e) => updateField('finalWeightGr', parseFloat(e.target.value))} style={inputStyle} />
                  {deliveredGr > 0 && (
                    <p className="text-[10px] mt-1" style={{ color: 'rgba(242,240,237,0.25)' }}>
                      Metal entregado: {deliveredGr.toFixed(3)} gr
                      {materialDifference !== 0 && (
                        <span style={{ marginLeft: 6, color: materialDifference > 0 ? 'rgba(251,146,60,0.8)' : 'rgba(110,231,183,0.8)' }}>
                          ({materialDifference > 0 ? '+' : ''}{materialDifference.toFixed(3)} gr vs entregado)
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Material devuelto / excedente (gr) *</label>
                  <input type="number" step="0.01" min="0" value={formData.returnedMaterialGr} onChange={(e) => updateField('returnedMaterialGr', parseFloat(e.target.value))} style={inputStyle} />
                  <p className="text-[10px] mt-1" style={{ color: 'rgba(242,240,237,0.22)' }}>Metal sobrante que regresa al inventario</p>
                  {deliveredGr > 0 && formData.returnedMaterialGr > 0 && surplusGr !== 0 && (
                    <p className="text-[10px] mt-0.5" style={{ color: surplusGr > 0.01 ? 'rgba(251,146,60,0.7)' : 'rgba(110,231,183,0.7)' }}>
                      {surplusGr > 0.01 ? `⚠ Diferencia no contabilizada: ${surplusGr.toFixed(3)} gr` : `✓ Metal cuadra correctamente`}
                    </p>
                  )}
                </div>
                {currentCycle.includesStones && (
                  <div>
                    <label style={labelStyle}>Sobrantes piedras (gr)</label>
                    <input type="number" step="0.01" min="0" value={formData.leftoverStonesGr || ''} onChange={(e) => updateField('leftoverStonesGr', parseFloat(e.target.value) || undefined)} style={inputStyle} />
                    <p className="text-[10px] mt-1" style={{ color: 'rgba(242,240,237,0.22)' }}>Entregadas: {currentCycle.stoneWeightGr || 0} gr</p>
                  </div>
                )}
              </div>
            </div>

            {/* Control de calidad */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgba(212,175,55,0.6)' }}>
                <CheckCircle size={11} /> Control de Calidad
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'approved', label: 'Aprobado', icon: <CheckCircle size={14} />, activeBg: 'rgba(16,185,129,0.1)', activeBorder: 'rgba(16,185,129,0.3)', activeColor: 'rgba(110,231,183,0.9)' },
                    { value: 'rejected', label: 'Rechazado', icon: <XCircle size={14} />, activeBg: 'rgba(239,68,68,0.1)', activeBorder: 'rgba(239,68,68,0.3)', activeColor: 'rgba(252,165,165,0.9)' },
                  ] as const).map((opt) => {
                    const active = formData.qcResult === opt.value;
                    return (
                      <button key={opt.value} type="button" onClick={() => updateField('qcResult', opt.value)}
                        className="py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                        style={{
                          background: active ? opt.activeBg : 'rgba(255,255,255,0.04)',
                          border: active ? `1px solid ${opt.activeBorder}` : '1px solid rgba(255,255,255,0.07)',
                          color: active ? opt.activeColor : 'rgba(242,240,237,0.35)',
                        }}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    );
                  })}
                </div>
                <div>
                  <label style={labelStyle}>Observaciones QC {formData.qcResult === 'rejected' && '*'}</label>
                  <textarea
                    value={formData.qcObservations}
                    onChange={(e) => updateField('qcObservations', e.target.value)}
                    rows={3}
                    placeholder={formData.qcResult === 'rejected' ? 'Describir las razones del rechazo y qué se debe corregir...' : 'Notas sobre el control de calidad (opcional)...'}
                    style={{ ...inputStyle, resize: 'none' }}
                  />
                </div>
                {formData.qcResult === 'rejected' && (
                  <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)' }}>
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: 'rgba(251,146,60,0.8)' }} />
                    <div>
                      <p className="text-xs font-semibold mb-0.5" style={{ color: 'rgba(251,146,60,0.9)' }}>Atención</p>
                      <p className="text-[11px]" style={{ color: 'rgba(251,146,60,0.65)' }}>Al rechazar el trabajo se creará un nuevo ciclo de retrabajo y el pedido volverá a &ldquo;Inicio Trabajo&rdquo;.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Responsables y fecha */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgba(212,175,55,0.6)' }}>
                <User size={11} /> Responsables y Fecha
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label style={labelStyle}>QC realizado por *</label>
                  <select
                    value={formData.qcByUserId}
                    onChange={(e) => updateField('qcByUserId', e.target.value)}
                    disabled={!isAdmin}
                    style={{
                      ...inputStyle,
                      appearance: 'none',
                      opacity: !isAdmin ? 0.72 : 1,
                      cursor: !isAdmin ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <option value="">Seleccionar...</option>
                    {qualityControllers.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Trabajo recibido por *</label>
                  <select
                    value={formData.workReceivedByUserId}
                    onChange={(e) => updateField('workReceivedByUserId', e.target.value)}
                    disabled={!isAdmin}
                    style={{
                      ...inputStyle,
                      appearance: 'none',
                      opacity: !isAdmin ? 0.72 : 1,
                      cursor: !isAdmin ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <option value="">Seleccionar...</option>
                    {responsibleUsers.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Fecha entrega *</label>
                  <input type="date" value={formData.workDeliveryDate} onChange={(e) => updateField('workDeliveryDate', e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-5 py-4 flex items-center gap-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl text-xs font-semibold uppercase tracking-[0.08em] transition-all disabled:opacity-50"
              style={{
                background: isApproved
                  ? 'linear-gradient(135deg, rgba(110,231,183,0.9), rgba(16,185,129,0.85))'
                  : 'linear-gradient(135deg, rgba(252,165,165,0.85), rgba(239,68,68,0.8))',
                color: isApproved ? '#0a1f17' : '#2a0a0a',
              }}
            >
              {loading ? (
                <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Procesando...</>
              ) : isApproved ? (
                <><CheckCircle size={13} /> Aprobar y Finalizar</>
              ) : (
                <><XCircle size={13} /> Rechazar y Crear Retrabajo</>
              )}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-semibold transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
