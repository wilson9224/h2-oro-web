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
    if (cycle.qcResult === 'approved') {
      return <CheckCircle size={16} className="text-emerald-500" />;
    }
    if (cycle.qcResult === 'rejected') {
      return <XCircle size={16} className="text-red-500" />;
    }
    if (cycle.materialDeliveryDate && !cycle.workDeliveryDate) {
      return <Clock size={16} className="text-gold-500 animate-pulse" />;
    }
    return <Clock size={16} className="text-charcoal-500" />;
  };

  const getStatusColor = () => {
    if (cycle.qcResult === 'approved') {
      return 'bg-emerald-500/20 border-emerald-500/30';
    }
    if (cycle.qcResult === 'rejected') {
      return 'bg-red-500/20 border-red-500/30';
    }
    if (cycle.materialDeliveryDate && !cycle.workDeliveryDate) {
      return 'bg-gold-500/20 border-gold-500/30';
    }
    return 'bg-charcoal-800 border-white/5';
  };

  const getStatusLabel = () => {
    if (cycle.qcResult === 'approved') return 'QC Aprobado';
    if (cycle.qcResult === 'rejected') return 'QC Rechazado';
    if (cycle.materialDeliveryDate && !cycle.workDeliveryDate) return 'En Producción';
    if (cycle.isRework) return 'Retrabajo';
    return 'Pendiente';
  };

  return (
    <div className={`border rounded-lg transition-all ${getStatusColor()}`}>
      {/* Header del ciclo */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h4 className="text-sm font-medium text-cream-200 flex items-center gap-2">
                {cycle.isRework && <RotateCcw size={14} className="text-orange-500" />}
                Ciclo #{cycle.cycleNumber}
              </h4>
              <p className="text-xs text-charcoal-500">{getStatusLabel()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {cycle.reworkReason && (
              <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded">
                {cycle.reworkReason}
              </span>
            )}
            <button
              type="button"
              onClick={onToggle}
              className="text-charcoal-400 hover:text-cream-200 transition-colors"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Resumen rápido */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-charcoal-500">Inicio</p>
            <p className="text-cream-200">{formatDate(cycle.materialDeliveryDate)}</p>
          </div>
          <div>
            <p className="text-charcoal-500">Fin</p>
            <p className="text-cream-200">{formatDate(cycle.workDeliveryDate)}</p>
          </div>
          <div>
            <p className="text-charcoal-500">Peso final</p>
            <p className="text-cream-200">{cycle.finalWeightGr || '-'} gr</p>
          </div>
          <div>
            <p className="text-charcoal-500">QC</p>
            <p className="text-cream-200">{cycle.qcResult || '-'}</p>
          </div>
        </div>
      </div>

      {/* Detalles expandidos */}
      {isExpanded && (
        <div className="border-t border-white/5 p-4 space-y-6">
          {/* Fase 2: Inicio Trabajo */}
          <div>
            <h5 className="text-xs font-medium text-gold-400 mb-3 flex items-center gap-2">
              <Calendar size={12} />
              Fase 2: Inicio Trabajo
            </h5>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {cycle.jewelryMetalPurity && (
                <div>
                  <p className="text-charcoal-500">Pureza metal joyería</p>
                  <p className="text-cream-200">{cycle.jewelryMetalPurity} K</p>
                </div>
              )}
              
              {cycle.jewelryMetalWeightGr && (
                <div>
                  <p className="text-charcoal-500">Peso metal joyería</p>
                  <p className="text-cream-200">{cycle.jewelryMetalWeightGr} gr</p>
                </div>
              )}
              
              {cycle.jewelryGoldColor && (
                <div>
                  <p className="text-charcoal-500">Color del oro</p>
                  <p className="text-cream-200">{getGoldColorLabel(cycle.jewelryGoldColor)}</p>
                </div>
              )}
              
              {cycle.approxGoldLaw && (
                <div>
                  <p className="text-charcoal-500">Ley aprox. oro</p>
                  <p className="text-cream-200">{cycle.approxGoldLaw} K</p>
                </div>
              )}
              
              {cycle.materialSurplusGr !== null && (
                <div>
                  <p className="text-charcoal-500">Excedente material</p>
                  <p className={`text-cream-200 ${cycle.materialSurplusGr < 0 ? 'text-orange-400' : ''}`}>
                    {cycle.materialSurplusGr > 0 ? '+' : ''}{cycle.materialSurplusGr} gr
                  </p>
                </div>
              )}
              
              {cycle.totalMetalWeightGr && (
                <div>
                  <p className="text-charcoal-500">Peso total metal</p>
                  <p className="text-cream-200">{cycle.totalMetalWeightGr} gr</p>
                </div>
              )}
              
              {cycle.includesStones && (
                <>
                  <div>
                    <p className="text-charcoal-500">Tipo de piedras</p>
                    <p className="text-cream-200">{cycle.stoneType || 'No especificado'}</p>
                  </div>
                  
                  {cycle.stoneCount && (
                    <div>
                      <p className="text-charcoal-500">Cantidad piedras</p>
                      <p className="text-cream-200">{cycle.stoneCount}</p>
                    </div>
                  )}
                  
                  {cycle.stoneWeightGr && (
                    <div>
                      <p className="text-charcoal-500">Peso piedras</p>
                      <p className="text-cream-200">{cycle.stoneWeightGr} gr</p>
                    </div>
                  )}
                </>
              )}
              
              <div>
                <p className="text-charcoal-500">Entregado por</p>
                <p className="text-cream-200">
                  {cycle.deliveredBy ? `${cycle.deliveredBy.firstName} ${cycle.deliveredBy.lastName}` : 'No asignado'}
                </p>
              </div>
              
              <div>
                <p className="text-charcoal-500">Recibido por</p>
                <p className="text-cream-200">
                  {cycle.receivedBy ? `${cycle.receivedBy.firstName} ${cycle.receivedBy.lastName}` : 'No asignado'}
                </p>
              </div>
              
              <div>
                <p className="text-charcoal-500">Fecha entrega material</p>
                <p className="text-cream-200">{formatDate(cycle.materialDeliveryDate)}</p>
              </div>
            </div>
          </div>

          {/* Fase 3: Fin Trabajo */}
          <div>
            <h5 className="text-xs font-medium text-gold-400 mb-3 flex items-center gap-2">
              <CheckCircle size={12} />
              Fase 3: Fin Trabajo
            </h5>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {cycle.finalWeightGr && (
                <div>
                  <p className="text-charcoal-500">Peso final</p>
                  <p className="text-cream-200">{cycle.finalWeightGr} gr</p>
                </div>
              )}
              
              {cycle.leftoverStonesGr !== null && (
                <div>
                  <p className="text-charcoal-500">Sobrantes piedras</p>
                  <p className="text-cream-200">{cycle.leftoverStonesGr} gr</p>
                </div>
              )}
              
              {cycle.returnedMaterialGr !== null && (
                <div>
                  <p className="text-charcoal-500">Material devuelto</p>
                  <p className="text-cream-200">{cycle.returnedMaterialGr} gr</p>
                </div>
              )}
              
              <div>
                <p className="text-charcoal-500">Resultado QC</p>
                <p className={`text-cream-200 ${
                  cycle.qcResult === 'approved' ? 'text-emerald-400' : 
                  cycle.qcResult === 'rejected' ? 'text-red-400' : 
                  'text-charcoal-400'
                }`}>
                  {cycle.qcResult === 'approved' ? 'Aprobado' : 
                   cycle.qcResult === 'rejected' ? 'Rechazado' : 
                   'Pendiente'}
                </p>
              </div>
              
              <div>
                <p className="text-charcoal-500">QC por</p>
                <p className="text-cream-200">
                  {cycle.qcBy ? `${cycle.qcBy.firstName} ${cycle.qcBy.lastName}` : 'No asignado'}
                </p>
              </div>
              
              <div>
                <p className="text-charcoal-500">Recibido trabajo por</p>
                <p className="text-cream-200">
                  {cycle.workReceivedBy ? `${cycle.workReceivedBy.firstName} ${cycle.workReceivedBy.lastName}` : 'No asignado'}
                </p>
              </div>
              
              <div>
                <p className="text-charcoal-500">Fecha entrega trabajo</p>
                <p className="text-cream-200">{formatDate(cycle.workDeliveryDate)}</p>
              </div>
            </div>

            {cycle.qcObservations && (
              <div className="mt-4 p-3 bg-charcoal-900 rounded">
                <p className="text-xs text-charcoal-500 mb-1">Observaciones QC:</p>
                <p className="text-xs text-charcoal-300">{cycle.qcObservations}</p>
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
    <div className="space-y-6">
      <div className="bg-charcoal-800/50 border border-white/5 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-cream-100">Ciclos de Trabajo</h3>
          <span className="text-xs text-charcoal-400">
            {cycles.length} ciclo{cycles.length !== 1 ? 's' : ''}
          </span>
        </div>

        {cycles.length === 0 ? (
          <div className="text-center py-8">
            <RotateCcw size={32} className="mx-auto text-charcoal-600 mb-2" />
            <p className="text-sm text-charcoal-500">No hay ciclos de trabajo registrados</p>
          </div>
        ) : (
          <div className="space-y-4">
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

      {/* Estadísticas */}
      {cycles.length > 0 && (
        <div className="bg-charcoal-800/50 border border-white/5 rounded-lg p-6">
          <h3 className="text-sm font-medium text-cream-100 mb-4">Estadísticas</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-charcoal-500 mb-1">Ciclos totales</p>
              <p className="text-sm text-cream-200 font-medium">{cycles.length}</p>
            </div>
            
            <div>
              <p className="text-xs text-charcoal-500 mb-1">Retrabajos</p>
              <p className="text-sm text-orange-400 font-medium">
                {cycles.filter(c => c.isRework).length}
              </p>
            </div>
            
            <div>
              <p className="text-xs text-charcoal-500 mb-1">QC Aprobados</p>
              <p className="text-sm text-emerald-400 font-medium">
                {cycles.filter(c => c.qcResult === 'approved').length}
              </p>
            </div>
            
            <div>
              <p className="text-xs text-charcoal-500 mb-1">QC Rechazados</p>
              <p className="text-sm text-red-400 font-medium">
                {cycles.filter(c => c.qcResult === 'rejected').length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
