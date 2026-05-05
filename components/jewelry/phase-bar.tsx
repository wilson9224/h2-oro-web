'use client';

import { Check, Clock, Lock, PlayCircle, Calendar, User, Package } from 'lucide-react';

interface Phase {
  key: string;
  name: string;
  status: 'completed' | 'active' | 'pending' | 'blocked';
}

interface PhaseBarProps {
  currentPhase: string;
  isDelivered?: boolean;
  deliveredDate?: string;
  deliveredBy?: string;
}

const STATUS_LABEL: Record<Phase['status'], string> = {
  completed: 'Completada',
  active: 'Activa',
  pending: 'Pendiente',
  blocked: 'Bloqueada',
};

const STATUS_CIRCLE_STYLE: Record<Phase['status'], React.CSSProperties> = {
  completed: { background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.5)' },
  active:    { background: 'rgba(212,175,55,0.14)', border: '2px solid rgba(212,175,55,0.6)' },
  pending:   { background: 'rgba(255,255,255,0.04)', border: '2px solid rgba(255,255,255,0.1)' },
  blocked:   { background: 'rgba(239,68,68,0.08)', border: '2px solid rgba(239,68,68,0.25)' },
};

const STATUS_ICON_COLOR: Record<Phase['status'], string> = {
  completed: 'rgba(110,231,183,0.9)',
  active:    'rgba(212,175,55,0.95)',
  pending:   'rgba(242,240,237,0.22)',
  blocked:   'rgba(252,165,165,0.7)',
};

export default function PhaseBar({ currentPhase, isDelivered, deliveredDate, deliveredBy }: PhaseBarProps) {
  const phases: Phase[] = [
    { key: 'creation',   name: 'Creación',       status: 'pending' },
    { key: 'start_work', name: 'Inicio Trabajo',  status: 'pending' },
    { key: 'end_work',   name: 'Fin Trabajo',     status: 'pending' },
    { key: 'delivery',   name: 'Entrega',         status: 'pending' },
  ];

  const phaseIndex = phases.findIndex(p => p.key === currentPhase);

  phases.forEach((phase, index) => {
    if (isDelivered) {
      phase.status = 'completed';
    } else if (index < phaseIndex) {
      phase.status = 'completed';
    } else if (index === phaseIndex) {
      phase.status = 'active';
    } else if (index === phaseIndex + 1) {
      phase.status = 'pending';
    } else {
      phase.status = 'blocked';
    }
  });

  const getIcon = (status: Phase['status']) => {
    const color = STATUS_ICON_COLOR[status];
    const isActive = status === 'active';
    switch (status) {
      case 'completed': return <Check size={16} style={{ color }} />;
      case 'active':    return <PlayCircle size={16} className={isActive ? 'animate-pulse' : ''} style={{ color }} />;
      case 'pending':   return <Clock size={16} style={{ color }} />;
      case 'blocked':   return <Lock size={14} style={{ color }} />;
    }
  };

  const completedCount = phases.filter(p => p.status === 'completed').length;
  const progressPct = Math.round((completedCount / phases.length) * 100);
  const activePhase = phases.find(p => p.key === currentPhase);

  return (
    <div
      className="rounded-2xl p-5 font-sans-custom"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)' }}
          >
            <Package size={15} style={{ color: 'rgba(212,175,55,0.8)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'rgba(242,240,237,0.82)' }}>Progreso del Pedido</p>
            <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: 'rgba(242,240,237,0.3)' }}>
              {isDelivered ? 'Entregado' : `Fase actual: ${activePhase?.name ?? '—'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tabular-nums" style={{ color: 'rgba(242,240,237,0.4)' }}>{progressPct}%</span>
          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: progressPct === 100
                  ? 'rgba(110,231,183,0.7)'
                  : 'linear-gradient(90deg, rgba(110,231,183,0.6) 0%, rgba(212,175,55,0.7) 100%)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      {/* Outer wrapper: relative so we can absolutely position the connector track */}
      <div className="relative flex items-start justify-between">
        {/* Background connector track — spans circle centers: left offset = half circle width (20px), right same */}
        <div
          className="absolute h-px"
          style={{
            top: 20, // half of the 40px circle height
            left: 52,  // half minWidth(64) + half connector gap
            right: 52,
            background: 'rgba(255,255,255,0.07)',
            zIndex: 0,
          }}
        />
        {/* Filled progress overlay */}
        <div
          className="absolute h-px transition-all duration-500"
          style={{
            top: 20,
            left: 52,
            width: phaseIndex > 0 || isDelivered
              ? `calc(${isDelivered ? 100 : (phaseIndex / (phases.length - 1)) * 100}% - 0px)`
              : '0%',
            background: 'rgba(110,231,183,0.45)',
            zIndex: 0,
          }}
        />

        {phases.map((phase, index) => (
          <div
            key={phase.key}
            className="flex flex-col items-center"
            style={{ flex: 1, position: 'relative', zIndex: 1 }}
          >
            {/* Circle */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
              style={STATUS_CIRCLE_STYLE[phase.status]}
            >
              {getIcon(phase.status)}
            </div>

            {/* Number badge */}
            <div className="mt-1.5 mb-1">
              <span
                className="text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.28)' }}
              >
                {index + 1}
              </span>
            </div>

            {/* Label */}
            <p
              className="text-[10px] font-semibold text-center leading-tight"
              style={{ color: 'rgba(242,240,237,0.65)', maxWidth: 64 }}
            >
              {phase.name}
            </p>
            <p
              className="text-[9px] mt-0.5 uppercase tracking-wider text-center"
              style={{ color: STATUS_ICON_COLOR[phase.status] }}
            >
              {STATUS_LABEL[phase.status]}
            </p>
          </div>
        ))}
      </div>

      {/* Delivery info */}
      {isDelivered && deliveredDate && (
        <div
          className="mt-5 p-4 rounded-2xl flex items-center gap-3"
          style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}
        >
          <Check size={16} style={{ color: 'rgba(110,231,183,0.85)' }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'rgba(110,231,183,0.9)' }}>Pedido Entregado</p>
            <div className="flex items-center gap-4 mt-1">
              {deliveredDate && (
                <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(110,231,183,0.55)' }}>
                  <Calendar size={11} />
                  {new Date(deliveredDate).toLocaleDateString('es-CO')}
                </span>
              )}
              {deliveredBy && (
                <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(110,231,183,0.55)' }}>
                  <User size={11} />
                  {deliveredBy}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
