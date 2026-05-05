'use client';

import { Check, Clock, UserCircle2, AlertCircle } from 'lucide-react';

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
}

const STATUS_CONFIG: Record<string, {
  label: string;
  icon: JSX.Element;
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

export default function TabEstados({ pieces, activeCycle }: TabEstadosProps) {
  const laborItems: LaborAssignmentItem[] = activeCycle?.labor_assignments ?? [];

  // Índice de work_assignments por service_code para cruzar estado real
  const allAssignments = pieces.flatMap(p => p.assignments);
  const assignmentByCode: Record<string, WorkAssignment> = {};
  for (const a of allAssignments) {
    assignmentByCode[a.stageCode] = a;
  }

  // Lista ordenada por sort_order
  const sorted = [...laborItems].sort((a, b) => a.sort_order - b.sort_order);

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
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-sm font-semibold font-sans-custom mb-4" style={{ color: 'rgba(242,240,237,0.7)' }}>Mano de Obra</p>

      <div className="space-y-2">
        {sorted.map((item) => {
          const wa = assignmentByCode[item.service_code];
          const status = wa?.status ?? 'pending';
          const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
          const workerName = wa?.worker
            ? `${wa.worker.firstName} ${wa.worker.lastName}`
            : null;

          return (
            <div
              key={item.service_code}
              className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all"
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
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${wa.progressPct}%`, background: 'rgba(212,175,55,0.6)' }}
                    />
                  </div>
                  <span className="text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>{wa.progressPct}%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
