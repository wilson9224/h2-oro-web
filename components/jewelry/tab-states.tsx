'use client';

import { useState } from 'react';
import { Check, Clock, UserCircle2, ChevronDown, ChevronUp, Image, FileText } from 'lucide-react';

interface WorkflowState {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  isInitial: boolean;
  isFinal: boolean;
}

interface StateHistory {
  id: string;
  stateId: string;
  notes: string | null;
  createdAt: string;
  state: WorkflowState;
  changedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
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
  createdAt: string;
  updatedAt: string;
}

interface FileAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  entityType: string;
  entityId: string;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

interface TabEstadosProps {
  pieces: Array<{
    id: string;
    name: string;
    description: string | null;
    currentState: WorkflowState | null;
    stateHistory: StateHistory[];
    assignments: WorkAssignment[];
    attachments: FileAttachment[];
  }>;
  phaseLog?: Array<{
    id: string;
    previous_phase: string;
    new_phase: string;
    observation: string | null;
    created_at: string;
    user: {
      id: string;
      first_name: string;
      last_name: string;
    };
  }>;
}

interface StateItemProps {
  state: WorkflowState;
  history: StateHistory[];
  assignments: WorkAssignment[];
  attachments: FileAttachment[];
  isCurrent: boolean;
  isCompleted: boolean;
  stateLog?: any; // Para mostrar información del phase log
}

function StageAssignmentItem({ stage }: { stage: { stageCode: string; stageName: string; assignments: any[] } }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check size={16} className="text-emerald-500" />;
      case 'in_progress':
        return <Clock size={16} className="text-gold-500 animate-pulse" />;
      case 'assigned':
        return <UserCircle2 size={16} className="text-blue-500" />;
      default:
        return <Clock size={16} className="text-charcoal-500" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/20 border-emerald-500/30';
      case 'in_progress':
        return 'bg-gold-500/20 border-gold-500/30';
      case 'assigned':
        return 'bg-blue-500/20 border-blue-500/30';
      default:
        return 'bg-charcoal-800 border-white/5';
    }
  };

  return (
    <div className={`border rounded-lg p-4 transition-all ${getStatusColor(stage.assignments[0]?.status || 'pending')}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {stage.assignments.length > 0 && getStatusIcon(stage.assignments[0].status)}
          <div>
            <h4 className="text-sm font-medium text-cream-100">{stage.stageName}</h4>
            <p className="text-xs text-charcoal-400">{stage.stageCode}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {stage.assignments.length > 0 && (
            <span className="text-xs text-charcoal-400">
              {stage.assignments.length} asignado{stage.assignments.length !== 1 ? 's' : ''}
            </span>
          )}
          {stage.assignments.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-charcoal-400 hover:text-cream-200 transition-colors"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </div>

      {isExpanded && stage.assignments.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-charcoal-400 mb-2">Personal asignado:</p>
          {stage.assignments.map((assignment) => (
            <div key={assignment.id} className="flex items-center justify-between text-xs">
              <span className="text-charcoal-300">
                {assignment.worker.firstName} {assignment.worker.lastName}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-charcoal-500 capitalize">{assignment.status.replace('_', ' ')}</span>
                {assignment.progressPct > 0 && (
                  <span className="text-charcoal-600">{assignment.progressPct}%</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StateItem({ state, history, assignments, attachments, isCurrent, isCompleted, stateLog }: StateItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getStateIcon = () => {
    if (isCompleted) {
      return <Check size={16} className="text-emerald-500" />;
    }
    if (isCurrent) {
      return <Clock size={16} className="text-gold-500 animate-pulse" />;
    }
    return <Clock size={16} className="text-charcoal-500" />;
  };

  const getStateColor = () => {
    if (isCompleted) {
      return 'bg-emerald-500/20 border-emerald-500/30';
    }
    if (isCurrent) {
      return 'bg-gold-500/20 border-gold-500/30';
    }
    return 'bg-charcoal-800 border-white/5';
  };

  const relevantHistory = history.filter(h => h.stateId === state.id);
  const relevantAssignments = assignments.filter(a => a.stageCode === state.code);
  const relevantAttachments = attachments.filter(a => a.entityType === 'state' && a.entityId === state.id);

  return (
    <div className={`border rounded-lg p-4 transition-all ${getStateColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStateIcon()}
          <div>
            <h4 className="text-sm font-medium text-cream-200">{state.name}</h4>
            <p className="text-xs text-charcoal-500">{state.code}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {relevantAssignments.length > 0 && (
            <div className="flex -space-x-2">
              {relevantAssignments.slice(0, 3).map((assignment, idx) => (
                <div
                  key={assignment.id}
                  className="w-6 h-6 rounded-full bg-charcoal-700 border border-white/10 flex items-center justify-center"
                  title={`${assignment.worker.firstName} ${assignment.worker.lastName}`}
                >
                  <span className="text-[8px] text-cream-200">
                    {assignment.worker.firstName[0]}{assignment.worker.lastName[0]}
                  </span>
                </div>
              ))}
              {relevantAssignments.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-gold-500/20 border border-gold-500/30 flex items-center justify-center">
                  <span className="text-[8px] text-gold-400">+{relevantAssignments.length - 3}</span>
                </div>
              )}
            </div>
          )}
          
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-charcoal-400 hover:text-cream-200 transition-colors"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
          {/* Asignaciones */}
          {relevantAssignments.length > 0 && (
            <div>
              <p className="text-xs text-charcoal-400 mb-2">Asignado a:</p>
              <div className="space-y-1">
                {relevantAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between text-xs">
                    <span className="text-charcoal-300 flex items-center gap-2">
                      <UserCircle2 size={12} />
                      {assignment.worker.firstName} {assignment.worker.lastName}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-charcoal-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gold-500/50 rounded-full"
                          style={{ width: `${assignment.progressPct}%` }}
                        />
                      </div>
                      <span className="text-charcoal-500">{assignment.progressPct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historial */}
          {relevantHistory.length > 0 && (
            <div>
              <p className="text-xs text-charcoal-400 mb-2">Historial:</p>
              <div className="space-y-1">
                {relevantHistory.map((h) => (
                  <div key={h.id} className="text-xs">
                    <span className="text-charcoal-300">
                      {h.changedBy.firstName} {h.changedBy.lastName}
                    </span>
                    <span className="text-charcoal-600 ml-2">
                      {new Date(h.createdAt).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {h.notes && (
                      <p className="text-charcoal-500 mt-1">{h.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidencia */}
          {relevantAttachments.length > 0 && (
            <div>
              <p className="text-xs text-charcoal-400 mb-2">Evidencia:</p>
              <div className="flex flex-wrap gap-2">
                {relevantAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 px-2 py-1 bg-charcoal-900 rounded text-xs text-charcoal-300 hover:text-gold-400 transition-colors cursor-pointer"
                    onClick={() => window.open(attachment.fileUrl, '_blank')}
                  >
                    {attachment.mimeType.startsWith('image/') ? (
                      <Image size={12} />
                    ) : (
                      <FileText size={12} />
                    )}
                    <span className="truncate max-w-20">{attachment.fileName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Información del Phase Log */}
          {stateLog && (
            <div>
              <p className="text-xs text-charcoal-400 mb-2">Información del cambio:</p>
              <div className="text-xs">
                <span className="text-charcoal-300">
                  {stateLog.user.first_name} {stateLog.user.last_name}
                </span>
                <span className="text-charcoal-600 ml-2">
                  {new Date(stateLog.created_at).toLocaleDateString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {stateLog.observation && (
                  <p className="text-charcoal-500 mt-1">{stateLog.observation}</p>
                )}
              </div>
            </div>
          )}

          {/* Si no hay nada */}
          {relevantAssignments.length === 0 && relevantHistory.length === 0 && relevantAttachments.length === 0 && !stateLog && (
            <p className="text-xs text-charcoal-500 italic">No hay información registrada para este estado</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function TabEstados({ pieces, phaseLog }: TabEstadosProps) {
  console.log('TabEstados recibió pieces:', pieces);
  console.log('TabEstados recibió phaseLog:', phaseLog);
  
  // Obtener todos los work assignments únicos de todas las piezas
  const allAssignments = pieces.flatMap(piece => piece.assignments);
  console.log('All assignments:', allAssignments);
  
  // Agrupar assignments por stage_code para mostrar los estados del pedido
  const uniqueStages = Array.from(
    new Set(allAssignments.map(a => a.stageCode))
  ).map(stageCode => {
    const assignmentsForStage = allAssignments.filter(a => a.stageCode === stageCode);
    return {
      stageCode,
      stageName: getStageDisplayName(stageCode),
      assignments: assignmentsForStage,
    };
  });
  
  console.log('Unique stages:', uniqueStages);
  
  // Función para obtener nombre descriptivo del stage
  function getStageDisplayName(stageCode: string): string {
    const stageNames: Record<string, string> = {
      'creation': 'Creación',
      'start_work': 'Inicio Trabajo',
      'end_work': 'Fin Trabajo',
      'delivery': 'Entrega',
      'design': 'Diseño',
      'production': 'Producción',
      'quality_check': 'Control de Calidad',
      'polishing': 'Pulido',
      'stone_setting': 'Montaje de Piedras',
      'final_inspection': 'Inspección Final',
    };
    return stageNames[stageCode] || stageCode;
  }

  return (
    <div className="space-y-6">
      <div className="bg-charcoal-800/50 border border-white/5 rounded-lg p-6">
        <h3 className="text-sm font-medium text-cream-100 mb-4">Estados del Pedido</h3>
        
        {uniqueStages.length === 0 ? (
          <div className="text-center py-8">
            <Clock size={32} className="mx-auto text-charcoal-600 mb-2" />
            <p className="text-sm text-charcoal-500">No hay estados asignados para este pedido</p>
            <p className="text-xs text-charcoal-600 mt-1">Los estados se definen al crear el pedido</p>
          </div>
        ) : (
          <div className="space-y-3">
            {uniqueStages.map((stage) => (
              <StageAssignmentItem
                key={stage.stageCode}
                stage={stage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Resumen por pieza */}
      {pieces.length > 1 && (
        <div className="bg-charcoal-800/50 border border-white/5 rounded-lg p-6">
          <h3 className="text-sm font-medium text-cream-100 mb-4">Resumen por Pieza</h3>
          <div className="space-y-3">
            {pieces.map((piece) => (
              <div key={piece.id} className="flex items-center justify-between p-3 bg-charcoal-900 rounded">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    piece.currentState ? 'bg-gold-500' : 'bg-charcoal-600'
                  }`} />
                  <div>
                    <p className="text-sm text-cream-200">{piece.name}</p>
                    <p className="text-xs text-charcoal-500">
                      {piece.currentState ? piece.currentState.name : 'Sin estado'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-charcoal-500">
                    {piece.stateHistory.length} cambios
                  </p>
                  <p className="text-xs text-charcoal-500">
                    {piece.assignments.length} asignaciones
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
