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

const STATUS_CONFIG: Record<string, { label: string; icon: JSX.Element; rowClass: string; badgeClass: string }> = {
  completed: {
    label: 'Completado',
    icon: <Check size={15} className="text-emerald-400" />,
    rowClass: 'border-emerald-500/20 bg-emerald-500/5',
    badgeClass: 'bg-emerald-500/15 text-emerald-400',
  },
  in_progress: {
    label: 'En progreso',
    icon: <Clock size={15} className="text-gold-400 animate-pulse" />,
    rowClass: 'border-gold-500/20 bg-gold-500/5',
    badgeClass: 'bg-gold-500/15 text-gold-400',
  },
  pending: {
    label: 'Pendiente',
    icon: <Clock size={15} className="text-charcoal-500" />,
    rowClass: 'border-white/5 bg-charcoal-900/40',
    badgeClass: 'bg-charcoal-700 text-charcoal-400',
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
      <div className="bg-charcoal-800/50 border border-white/5 rounded-lg p-6">
        <h3 className="text-sm font-medium text-cream-100 mb-4">Mano de Obra</h3>
        <div className="text-center py-10">
          <AlertCircle size={28} className="mx-auto text-charcoal-600 mb-3" />
          <p className="text-sm text-charcoal-500">No hay estados de mano de obra registrados</p>
          <p className="text-xs text-charcoal-600 mt-1">
            Se asignan al hacer clic en <span className="text-gold-500">Iniciar Trabajo</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-charcoal-800/50 border border-white/5 rounded-lg p-6">
      <h3 className="text-sm font-medium text-cream-100 mb-5">Mano de Obra</h3>

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
              className={`flex items-center gap-4 border rounded-lg px-4 py-3 transition-colors ${cfg.rowClass}`}
            >
              {/* Número de orden */}
              <span className="text-[11px] font-mono text-charcoal-500 w-5 shrink-0 text-center">
                {item.sort_order}
              </span>

              {/* Ícono de estado */}
              <span className="shrink-0">{cfg.icon}</span>

              {/* Nombre del servicio */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-cream-200 font-medium">{item.service_name}</p>
              </div>

              {/* Encargado */}
              <div className="flex items-center gap-1.5 shrink-0">
                {workerName ? (
                  <>
                    <UserCircle2 size={13} className="text-charcoal-400" />
                    <span className="text-xs text-charcoal-300">{workerName}</span>
                  </>
                ) : (
                  <span className="text-xs text-charcoal-600 italic">Sin asignar</span>
                )}
              </div>

              {/* Badge de estado */}
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${cfg.badgeClass}`}>
                {cfg.label}
              </span>

              {/* Barra de progreso (solo si hay progreso) */}
              {wa && wa.progressPct > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-16 h-1.5 bg-charcoal-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold-500/60 rounded-full transition-all"
                      style={{ width: `${wa.progressPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-charcoal-500">{wa.progressPct}%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
