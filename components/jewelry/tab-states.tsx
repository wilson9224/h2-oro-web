'use client';

import { useState } from 'react';
import { Check, Clock, UserCircle2, AlertCircle, Pencil, RotateCcw, X, AlertTriangle, History } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface LaborAssignmentItem {
  service_code: string;
  service_name: string;
  service_category: string;
  worker_id: string;
  sort_order: number;
}

interface WorkAssignment {
  id: string;
  workerId: string;
  stageCode: string;
  status: string;
  progressPct: number;
  worker: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface ActiveCycle {
  labor_assignments?: LaborAssignmentItem[] | null;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
}

interface AssignmentLogEntry {
  id: string;
  previous_status: string;
  reason: string;
  created_at: string;
  previous_worker: { id: string; first_name: string; last_name: string } | null;
  new_worker: { id: string; first_name: string; last_name: string } | null;
  changed_by: { id: string; first_name: string; last_name: string } | null;
  assignment: { stage_code: string } | null;
}

interface TabEstadosProps {
  pieces: Array<{
    id: string;
    name: string;
    description: string | null;
    currentState: any;
    stateHistory: any[];
    assignments: WorkAssignment[];
    attachments: any[];
  }>;
  phaseLog?: any[];
  activeCycle?: ActiveCycle | null;
  users?: User[];
  assignmentLog?: AssignmentLogEntry[];
  onReassign?: (params: {
    assignmentId: string;
    pieceId: string;
    newWorkerId: string;
    reason: string;
    changedById: string;
  }) => Promise<void>;
  onAssign?: (params: {
    serviceCode: string;
    workerId: string;
    sortOrder: number;
  }) => Promise<void>;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  rowStyle: React.CSSProperties;
  badgeStyle: React.CSSProperties;
}> = {
  completed: {
    label: 'Completado',
    icon: <Check size={14} style={{ color: 'rgba(110,231,183,0.9)' }} />,
    rowStyle: { background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.18)' },
    badgeStyle: { background: 'rgba(16,185,129,0.1)', color: 'rgba(110,231,183,0.9)', border: '1px solid rgba(16,185,129,0.2)' },
  },
  in_progress: {
    label: 'En progreso',
    icon: <Clock size={14} className="animate-pulse" style={{ color: 'rgba(212,175,55,0.9)' }} />,
    rowStyle: { background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.18)' },
    badgeStyle: { background: 'rgba(212,175,55,0.1)', color: 'rgba(212,175,55,0.9)', border: '1px solid rgba(212,175,55,0.2)' },
  },
  pending: {
    label: 'Pendiente',
    icon: <Clock size={14} style={{ color: 'rgba(242,240,237,0.25)' }} />,
    rowStyle: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' },
    badgeStyle: { background: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.35)', border: '1px solid rgba(255,255,255,0.08)' },
  },
};

interface ReassignModalState {
  assignmentId: string;
  pieceId: string;
  stageCode: string;
  stageName: string;
  currentStatus: string;
  currentWorkerName: string;
}

interface AssignModalState {
  serviceCode: string;
  serviceName: string;
  sortOrder: number;
}

export default function TabEstados({
  pieces,
  activeCycle,
  users = [],
  assignmentLog = [],
  onReassign,
  onAssign,
}: TabEstadosProps) {
  const { user: adminUser } = useAuth();
  const laborItems: LaborAssignmentItem[] = activeCycle?.labor_assignments ?? [];

  const allAssignments = pieces.flatMap(p =>
    p.assignments.map(a => ({ ...a, pieceId: p.id }))
  );
  const assignmentByCode: Record<string, typeof allAssignments[0]> = {};
  for (const a of allAssignments) {
    assignmentByCode[a.stageCode] = a;
  }

  const sorted = [...laborItems].sort((a, b) => a.sort_order - b.sort_order);

  const [modal, setModal] = useState<ReassignModalState | null>(null);
  const [newWorkerId, setNewWorkerId] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [assignModal, setAssignModal] = useState<AssignModalState | null>(null);
  const [assignWorkerId, setAssignWorkerId] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');

  const openModal = (item: LaborAssignmentItem, wa: typeof allAssignments[0]) => {
    setModal({
      assignmentId: wa.id,
      pieceId: wa.pieceId,
      stageCode: item.service_code,
      stageName: item.service_name,
      currentStatus: wa.status,
      currentWorkerName: `${wa.worker.firstName} ${wa.worker.lastName}`,
    });
    setNewWorkerId('');
    setReason('');
    setSaveError('');
  };

  const closeModal = () => {
    setModal(null);
    setSaveError('');
  };

  const handleSave = async () => {
    if (!modal || !onReassign || !newWorkerId || !reason.trim() || !adminUser) return;
    setSaving(true);
    setSaveError('');
    try {
      await onReassign({
        assignmentId: modal.assignmentId,
        pieceId: modal.pieceId,
        newWorkerId,
        reason: reason.trim(),
        changedById: adminUser.id,
      });
      closeModal();
    } catch (err: any) {
      setSaveError(err?.message ?? 'Error al reasignar');
    } finally {
      setSaving(false);
    }
  };

  const isCompleted = modal?.currentStatus === 'completed';
  const canSave = !!newWorkerId && reason.trim().length > 0;

  const workerOptions = users.filter(u => u.role === 'jeweler' || u.role === 'designer');

  const openAssignModal = (item: LaborAssignmentItem) => {
    setAssignModal({ serviceCode: item.service_code, serviceName: item.service_name, sortOrder: item.sort_order });
    setAssignWorkerId('');
    setAssignError('');
  };

  const handleAssignSave = async () => {
    if (!assignModal || !onAssign || !assignWorkerId) return;
    setAssignSaving(true);
    setAssignError('');
    try {
      await onAssign({ serviceCode: assignModal.serviceCode, workerId: assignWorkerId, sortOrder: assignModal.sortOrder });
      setAssignModal(null);
    } catch (err: any) {
      setAssignError(err?.message ?? 'Error al asignar');
    } finally {
      setAssignSaving(false);
    }
  };

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-sm font-semibold font-sans-custom mb-4" style={{ color: 'rgba(242,240,237,0.7)' }}>Mano de Obra</p>
        <div className="text-center py-10">
          <AlertCircle size={26} className="mx-auto mb-3" style={{ color: 'rgba(242,240,237,0.15)' }} />
          <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>No hay estados de mano de obra registrados</p>
          <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>
            Se asignan al hacer clic en <span style={{ color: 'rgba(212,175,55,0.7)' }}>Iniciar Trabajo</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Assignment rows */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-sm font-semibold font-sans-custom mb-4" style={{ color: 'rgba(242,240,237,0.7)' }}>Mano de Obra</p>

        <div className="space-y-2">
          {sorted.map((item) => {
            const wa = assignmentByCode[item.service_code];
            const status = wa?.status ?? 'pending';
            const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
            const workerName = wa?.worker ? `${wa.worker.firstName} ${wa.worker.lastName}` : null;

            return (
              <div
                key={item.service_code}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                style={cfg.rowStyle}
              >
                <span className="text-[11px] font-mono w-5 shrink-0 text-center" style={{ color: 'rgba(242,240,237,0.25)' }}>
                  {item.sort_order}
                </span>

                <span className="shrink-0">{cfg.icon}</span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.85)' }}>{item.service_name}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {workerName ? (
                    <>
                      <UserCircle2 size={12} style={{ color: 'rgba(242,240,237,0.3)' }} />
                      <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.55)' }}>{workerName}</span>
                    </>
                  ) : (
                    <span className="text-xs italic font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>Sin asignar</span>
                  )}
                </div>

                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 font-sans-custom"
                  style={cfg.badgeStyle}
                >
                  {cfg.label}
                </span>

                {wa && wa.progressPct > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${wa.progressPct}%`, background: 'rgba(212,175,55,0.6)' }} />
                    </div>
                    <span className="text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>{wa.progressPct}%</span>
                  </div>
                )}

                {/* Assign button — when no assignment exists yet */}
                {!wa && onAssign && (
                  <button
                    onClick={() => openAssignModal(item)}
                    className="shrink-0 flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-sans-custom transition-all"
                    style={{
                      background: 'rgba(212,175,55,0.08)',
                      border: '1px solid rgba(212,175,55,0.2)',
                      color: 'rgba(212,175,55,0.8)',
                    }}
                    title="Asignar trabajador"
                  >
                    <UserCircle2 size={11} />
                    Asignar
                  </button>
                )}

                {/* Reassign button — only when assignment exists */}
                {wa && onReassign && (
                  <button
                    onClick={() => openModal(item, wa)}
                    className="shrink-0 flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-sans-custom transition-all"
                    style={{
                      background: status === 'completed' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)',
                      border: status === 'completed' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.08)',
                      color: status === 'completed' ? 'rgba(252,165,165,0.7)' : 'rgba(242,240,237,0.4)',
                    }}
                    title={status === 'completed' ? 'Reversar y reasignar' : 'Reasignar trabajador'}
                  >
                    {status === 'completed'
                      ? <RotateCcw size={11} />
                      : <Pencil size={11} />
                    }
                    {status === 'completed' ? 'Reversar' : 'Reasignar'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Assignment change log */}
      {assignmentLog.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2 mb-4">
            <History size={14} style={{ color: 'rgba(242,240,237,0.35)' }} />
            <p className="text-sm font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.5)' }}>Historial de reasignaciones</p>
          </div>
          <div className="space-y-3">
            {assignmentLog.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl p-3"
                style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold font-sans-custom" style={{ color: 'rgba(252,165,165,0.8)' }}>
                      {entry.assignment?.stage_code ?? '—'}
                      <span className="ml-1.5 font-normal" style={{ color: 'rgba(242,240,237,0.3)' }}>
                        · estaba en <span style={{ color: 'rgba(252,165,165,0.6)' }}>{entry.previous_status}</span>
                      </span>
                    </p>
                    <p className="text-[11px] mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.5)' }}>
                      <span style={{ color: 'rgba(242,240,237,0.35)' }}>De:</span>{' '}
                      {entry.previous_worker ? `${entry.previous_worker.first_name} ${entry.previous_worker.last_name}` : '—'}
                      {' → '}
                      <span style={{ color: 'rgba(110,231,183,0.7)' }}>
                        {entry.new_worker ? `${entry.new_worker.first_name} ${entry.new_worker.last_name}` : '—'}
                      </span>
                    </p>
                    <p className="text-[11px] mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                      <span style={{ color: 'rgba(242,240,237,0.2)' }}>Razón:</span> {entry.reason}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>
                      {new Date(entry.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    {entry.changed_by && (
                      <p className="text-[10px] font-sans-custom mt-0.5" style={{ color: 'rgba(242,240,237,0.2)' }}>
                        por {entry.changed_by.first_name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign Modal — for unassigned stages */}
      {assignModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden"
            style={{
              background: 'rgba(14,13,12,0.98)',
              border: '1px solid rgba(212,175,55,0.15)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
            }}
          >
            <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div>
                <p className="font-display text-sm font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>Asignar trabajador</p>
                <p className="text-xs mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>{assignModal.serviceName}</p>
              </div>
              <button onClick={() => setAssignModal(null)} className="p-1.5 rounded-lg" style={{ color: 'rgba(242,240,237,0.35)' }}>
                <X size={14} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] mb-1.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Trabajador *</p>
                <select
                  value={assignWorkerId}
                  onChange={e => setAssignWorkerId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-sans-custom outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: assignWorkerId ? 'rgba(242,240,237,0.85)' : 'rgba(242,240,237,0.3)',
                  }}
                >
                  <option value="">Seleccionar trabajador...</option>
                  {workerOptions.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} {u.role === 'designer' ? '(Diseñador)' : '(Joyero)'}
                    </option>
                  ))}
                </select>
              </div>
              {assignError && (
                <p className="text-xs font-sans-custom" style={{ color: 'rgba(252,165,165,0.8)' }}>{assignError}</p>
              )}
            </div>

            <div className="px-5 pb-5 pt-1 flex gap-2">
              <button
                onClick={() => setAssignModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-sans-custom"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.45)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAssignSave}
                disabled={!assignWorkerId || assignSaving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold font-sans-custom transition-all disabled:opacity-40"
                style={{
                  background: 'rgba(212,175,55,0.15)',
                  border: '1px solid rgba(212,175,55,0.25)',
                  color: 'rgba(212,175,55,0.95)',
                }}
              >
                {assignSaving ? 'Asignando...' : 'Confirmar asignación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-md rounded-3xl overflow-hidden"
            style={{
              background: 'rgba(14,13,12,0.98)',
              border: `1px solid ${isCompleted ? 'rgba(239,68,68,0.2)' : 'rgba(212,175,55,0.15)'}`,
              boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
            }}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div>
                <p className="font-display text-sm font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>
                  {isCompleted ? 'Reversar y reasignar' : 'Reasignar trabajador'}
                </p>
                <p className="text-xs mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                  {modal.stageName}
                </p>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg" style={{ color: 'rgba(242,240,237,0.35)' }}>
                <X size={14} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Warning for completed */}
              {isCompleted && (
                <div className="flex items-start gap-2.5 rounded-xl p-3"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: 'rgba(252,165,165,0.8)' }} />
                  <p className="text-[11px] font-sans-custom leading-relaxed" style={{ color: 'rgba(252,165,165,0.75)' }}>
                    Esta etapa está <strong>completada</strong>. Al reasignar se revertirá a pendiente, el pago de{' '}
                    <strong>{modal.currentWorkerName}</strong> será anulado, y si ya fue pagado se creará un descuento automático en su próximo pago.
                  </p>
                </div>
              )}

              {/* Current worker info */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] mb-1.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                  Trabajador actual
                </p>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <UserCircle2 size={13} style={{ color: 'rgba(242,240,237,0.3)' }} />
                  <span className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>
                    {modal.currentWorkerName}
                  </span>
                </div>
              </div>

              {/* New worker select */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] mb-1.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                  Nuevo trabajador *
                </p>
                <select
                  value={newWorkerId}
                  onChange={e => setNewWorkerId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-sans-custom outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: newWorkerId ? 'rgba(242,240,237,0.85)' : 'rgba(242,240,237,0.3)',
                  }}
                >
                  <option value="">Seleccionar trabajador...</option>
                  {workerOptions.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} {u.role === 'designer' ? '(Diseñador)' : '(Joyero)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] mb-1.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                  Razón del cambio *
                </p>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Ej: Error de calidad en el acabado, se reasigna a joyero más experimentado..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-sans-custom outline-none resize-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(242,240,237,0.85)',
                  }}
                />
              </div>

              {saveError && (
                <p className="text-xs font-sans-custom" style={{ color: 'rgba(252,165,165,0.8)' }}>{saveError}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-1 flex gap-2">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-sans-custom transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.45)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave || saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold font-sans-custom transition-all disabled:opacity-40"
                style={{
                  background: isCompleted ? 'rgba(239,68,68,0.15)' : 'rgba(212,175,55,0.15)',
                  border: isCompleted ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(212,175,55,0.25)',
                  color: isCompleted ? 'rgba(252,165,165,0.9)' : 'rgba(212,175,55,0.95)',
                }}
              >
                {saving ? 'Guardando...' : isCompleted ? 'Reversar y reasignar' : 'Confirmar reasignación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
