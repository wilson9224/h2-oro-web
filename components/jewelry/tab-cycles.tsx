'use client';

import { useState } from 'react';
import { RotateCcw, CheckCircle, XCircle, Clock, User, Calendar, Scale, Calculator, ChevronDown, ChevronUp } from 'lucide-react';

interface WorkCycle {
  id: string;
  orderId: string;
  cycleNumber: number;
  isRework: boolean;
  reworkReason: string | null;
  // Fase 2: Inicio trabajo
  jewelryMetalPurity: number | null;
  jewelryMetalWeightGr: number | null;
  jewelryGoldColor: 'yellow' | 'rose' | 'white' | null;
  approxGoldLaw: number | null;
  materialSurplusGr: number | null;
  totalMetalWeightGr: number | null;
  includesStones: boolean | null;
  stoneType: string | null;
  stoneCount: number | null;
  stoneWeightGr: number | null;
  deliveredByUserId: string | null;
  receivedByUserId: string | null;
  materialDeliveryDate: string | null;
  // Fase 3: Fin trabajo
  finalWeightGr: number | null;
  leftoverStonesGr: number | null;
  returnedMaterialGr: number | null;
  qcResult: 'approved' | 'rejected' | null;
  qcObservations: string | null;
  qcByUserId: string | null;
  workReceivedByUserId: string | null;
  workDeliveryDate: string | null;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  // Relaciones (incluidas en la query)
  deliveredBy?: { id: string; firstName: string; lastName: string } | null;
  receivedBy?: { id: string; firstName: string; lastName: string } | null;
  qcBy?: { id: string; firstName: string; lastName: string } | null;
  workReceivedBy?: { id: string; firstName: string; lastName: string } | null;
}

interface TabCiclosProps {
  cycles: WorkCycle[];
}

interface CycleCardProps {
  cycle: WorkCycle;
  isExpanded: boolean;
  onToggle: () => void;
}

function CycleCard({ cycle, isExpanded, onToggle }: CycleCardProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No registrada';
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getGoldColorLabel = (color: string) => {
    const colors: Record<string, string> = {
      yellow: 'Amarillo',
      rose: 'Rosado',
      white: 'Blanco',
    };
    return colors[color] || color;
  };

  const getStatusIcon = () => {
    if (cycle.qcResult === 'approved') return <CheckCircle size={15} style={{ color: 'rgba(110,231,183,0.85)' }} />;
    if (cycle.qcResult === 'rejected') return <XCircle size={15} style={{ color: 'rgba(252,165,165,0.85)' }} />;
    if (cycle.materialDeliveryDate && !cycle.workDeliveryDate) return <Clock size={15} className="animate-pulse" style={{ color: 'rgba(212,175,55,0.85)' }} />;
    return <Clock size={15} style={{ color: 'rgba(242,240,237,0.2)' }} />;
  };

  const getStatusStyle = (): React.CSSProperties => {
    if (cycle.qcResult === 'approved') return { background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.22)' };
    if (cycle.qcResult === 'rejected') return { background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)' };
    if (cycle.materialDeliveryDate && !cycle.workDeliveryDate) return { background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.22)' };
    return { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' };
  };

  const getStatusLabel = () => {
    if (cycle.qcResult === 'approved') return 'QC Aprobado';
    if (cycle.qcResult === 'rejected') return 'QC Rechazado';
    if (cycle.materialDeliveryDate && !cycle.workDeliveryDate) return 'En Producción';
    if (cycle.isRework) return 'Retrabajo';
    return 'Pendiente';
  };

  const MiniField = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <div>
      <p className="text-[10px] uppercase tracking-[0.1em] font-semibold font-sans-custom mb-0.5" style={{ color: 'rgba(242,240,237,0.28)' }}>{label}</p>
      <p className="text-xs font-sans-custom" style={{ color: color ?? 'rgba(242,240,237,0.75)' }}>{value}</p>
    </div>
  );

  return (
    <div className="rounded-2xl overflow-hidden transition-all" style={getStatusStyle()}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <p className="text-sm font-semibold font-sans-custom flex items-center gap-2" style={{ color: 'rgba(242,240,237,0.85)' }}>
                {cycle.isRework && <RotateCcw size={13} style={{ color: 'rgba(249,115,22,0.8)' }} />}
                Ciclo #{cycle.cycleNumber}
              </p>
              <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>{getStatusLabel()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cycle.reworkReason && (
              <span className="text-xs font-sans-custom px-2 py-1 rounded-lg" style={{ background: 'rgba(249,115,22,0.1)', color: 'rgba(253,186,116,0.85)' }}>
                {cycle.reworkReason}
              </span>
            )}
            <button type="button" onClick={onToggle} className="transition-colors" style={{ color: 'rgba(242,240,237,0.3)' }}>
              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniField label="Inicio" value={formatDate(cycle.materialDeliveryDate)} />
          <MiniField label="Fin" value={formatDate(cycle.workDeliveryDate)} />
          <MiniField label="Peso final" value={cycle.finalWeightGr ? `${cycle.finalWeightGr} gr` : '—'} />
          <MiniField
            label="QC"
            value={cycle.qcResult === 'approved' ? 'Aprobado' : cycle.qcResult === 'rejected' ? 'Rechazado' : '—'}
            color={cycle.qcResult === 'approved' ? 'rgba(110,231,183,0.85)' : cycle.qcResult === 'rejected' ? 'rgba(252,165,165,0.85)' : 'rgba(242,240,237,0.35)'}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <p className="text-xs font-semibold font-sans-custom mb-3 flex items-center gap-2" style={{ color: 'rgba(212,175,55,0.7)' }}>
              <Calendar size={12} /> Fase 2: Inicio Trabajo
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cycle.jewelryMetalPurity && <MiniField label="Pureza metal joya" value={`${cycle.jewelryMetalPurity} K`} />}
              {cycle.jewelryMetalWeightGr && <MiniField label="Peso metal joya" value={`${cycle.jewelryMetalWeightGr} gr`} />}
              {cycle.jewelryGoldColor && <MiniField label="Color del oro" value={getGoldColorLabel(cycle.jewelryGoldColor)} />}
              {cycle.approxGoldLaw && <MiniField label="Ley aprox. oro" value={`${cycle.approxGoldLaw} K`} />}
              {cycle.materialSurplusGr !== null && (
                <MiniField
                  label="Excedente material"
                  value={`${cycle.materialSurplusGr > 0 ? '+' : ''}${cycle.materialSurplusGr} gr`}
                  color={cycle.materialSurplusGr < 0 ? 'rgba(253,186,116,0.85)' : undefined}
                />
              )}
              {cycle.totalMetalWeightGr && <MiniField label="Peso total metal" value={`${cycle.totalMetalWeightGr} gr`} />}
              {cycle.includesStones && (
                <>
                  <MiniField label="Tipo de piedras" value={cycle.stoneType || 'No especificado'} />
                  {cycle.stoneCount && <MiniField label="Cantidad piedras" value={String(cycle.stoneCount)} />}
                  {cycle.stoneWeightGr && <MiniField label="Peso piedras" value={`${cycle.stoneWeightGr} gr`} />}
                </>
              )}
              <MiniField label="Entregado por" value={cycle.deliveredBy ? `${cycle.deliveredBy.firstName} ${cycle.deliveredBy.lastName}` : 'No asignado'} />
              <MiniField label="Recibido por" value={cycle.receivedBy ? `${cycle.receivedBy.firstName} ${cycle.receivedBy.lastName}` : 'No asignado'} />
              <MiniField label="Fecha entrega material" value={formatDate(cycle.materialDeliveryDate)} />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold font-sans-custom mb-3 flex items-center gap-2" style={{ color: 'rgba(212,175,55,0.7)' }}>
              <CheckCircle size={12} /> Fase 3: Fin Trabajo
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cycle.finalWeightGr && <MiniField label="Peso final" value={`${cycle.finalWeightGr} gr`} />}
              {cycle.leftoverStonesGr !== null && <MiniField label="Sobrantes piedras" value={`${cycle.leftoverStonesGr} gr`} />}
              {cycle.returnedMaterialGr !== null && <MiniField label="Material devuelto" value={`${cycle.returnedMaterialGr} gr`} />}
              <MiniField
                label="Resultado QC"
                value={cycle.qcResult === 'approved' ? 'Aprobado' : cycle.qcResult === 'rejected' ? 'Rechazado' : 'Pendiente'}
                color={cycle.qcResult === 'approved' ? 'rgba(110,231,183,0.85)' : cycle.qcResult === 'rejected' ? 'rgba(252,165,165,0.85)' : undefined}
              />
              <MiniField label="QC por" value={cycle.qcBy ? `${cycle.qcBy.firstName} ${cycle.qcBy.lastName}` : 'No asignado'} />
              <MiniField label="Trabajo recibido por" value={cycle.workReceivedBy ? `${cycle.workReceivedBy.firstName} ${cycle.workReceivedBy.lastName}` : 'No asignado'} />
              <MiniField label="Fecha entrega trabajo" value={formatDate(cycle.workDeliveryDate)} />
            </div>

            {cycle.qcObservations && (
              <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className="text-[10px] uppercase tracking-wider font-sans-custom mb-1" style={{ color: 'rgba(242,240,237,0.3)' }}>Observaciones QC</p>
                <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.65)' }}>{cycle.qcObservations}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TabCiclos({ cycles }: TabCiclosProps) {
  const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set());

  const toggleCycle = (cycleId: string) => {
    const newExpanded = new Set(expandedCycles);
    if (newExpanded.has(cycleId)) {
      newExpanded.delete(cycleId);
    } else {
      newExpanded.add(cycleId);
    }
    setExpandedCycles(newExpanded);
  };

  // Ordenar ciclos por número (descendente para mostrar el más reciente primero)
  const sortedCycles = [...cycles].sort((a, b) => b.cycleNumber - a.cycleNumber);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>Ciclos de Trabajo</p>
          <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
            {cycles.length} ciclo{cycles.length !== 1 ? 's' : ''}
          </span>
        </div>

        {cycles.length === 0 ? (
          <div className="text-center py-8">
            <RotateCcw size={28} className="mx-auto mb-2" style={{ color: 'rgba(242,240,237,0.12)' }} />
            <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>No hay ciclos de trabajo registrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedCycles.map((cycle) => (
              <CycleCard
                key={cycle.id}
                cycle={cycle}
                isExpanded={expandedCycles.has(cycle.id)}
                onToggle={() => toggleCycle(cycle.id)}
              />
            ))}
          </div>
        )}
      </div>

      {cycles.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm font-semibold font-sans-custom mb-4" style={{ color: 'rgba(242,240,237,0.7)' }}>Estadísticas</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Ciclos totales', value: cycles.length, color: 'rgba(242,240,237,0.8)' },
              { label: 'Retrabajos', value: cycles.filter(c => c.isRework).length, color: 'rgba(253,186,116,0.85)' },
              { label: 'QC Aprobados', value: cycles.filter(c => c.qcResult === 'approved').length, color: 'rgba(110,231,183,0.85)' },
              { label: 'QC Rechazados', value: cycles.filter(c => c.qcResult === 'rejected').length, color: 'rgba(252,165,165,0.85)' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-[10px] uppercase tracking-[0.12em] font-semibold font-sans-custom mb-1" style={{ color: 'rgba(242,240,237,0.28)' }}>{stat.label}</p>
                <p className="text-lg font-semibold font-sans-custom" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
