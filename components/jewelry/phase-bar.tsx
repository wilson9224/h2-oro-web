'use client';

import { Check, Clock, Lock, PlayCircle, ChevronRight, Calendar, User, Package } from 'lucide-react';

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

export default function PhaseBar({ currentPhase, isDelivered, deliveredDate, deliveredBy }: PhaseBarProps) {
  console.log('PhaseBar recibió currentPhase:', currentPhase);
  console.log('PhaseBar recibió isDelivered:', isDelivered);
  const phases: Phase[] = [
    { key: 'creation', name: 'Creación', status: 'pending' },
    { key: 'start_work', name: 'Inicio Trabajo', status: 'pending' },
    { key: 'end_work', name: 'Fin Trabajo', status: 'pending' },
    { key: 'delivery', name: 'Entrega', status: 'pending' },
  ];

  // Determinar el estado de cada fase
  const phaseIndex = phases.findIndex(p => p.key === currentPhase);
  
  phases.forEach((phase, index) => {
    if (isDelivered) {
      // Si está entregado, todo está completado
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

  const getPhaseIcon = (status: Phase['status']) => {
    switch (status) {
      case 'completed':
        return <Check size={18} className="text-emerald-400" />;
      case 'active':
        return <PlayCircle size={18} className="text-gold-400 animate-pulse" />;
      case 'pending':
        return <Clock size={18} className="text-charcoal-400" />;
      case 'blocked':
        return <Lock size={18} className="text-red-400" />;
    }
  };

  const getPhaseColor = (status: Phase['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-emerald-500/20';
      case 'active':
        return 'bg-gold-500/10 border-gold-500/50 text-gold-400 shadow-gold-500/20 animate-pulse';
      case 'pending':
        return 'bg-charcoal-800/50 border-charcoal-600/50 text-charcoal-400';
      case 'blocked':
        return 'bg-red-500/10 border-red-500/50 text-red-400 shadow-red-500/20';
    }
  };

  const getPhaseBg = (status: Phase['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/5';
      case 'active':
        return 'bg-gold-500/5';
      case 'pending':
        return 'bg-charcoal-800/30';
      case 'blocked':
        return 'bg-red-500/5';
    }
  };

  const getConnectorColor = (index: number) => {
    if (index === phases.length - 1) return 'border-transparent';
    const currentPhaseIndex = phases.findIndex(p => p.key === currentPhase);
    if (index < currentPhaseIndex) return 'border-emerald-500/50';
    if (index === currentPhaseIndex) return 'border-gold-500/50';
    return 'border-charcoal-700';
  };

  return (
    <div className="bg-gradient-to-br from-charcoal-800/80 to-charcoal-900/80 border border-white/10 rounded-xl p-6 backdrop-blur-sm shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gold-500/20 rounded-lg flex items-center justify-center">
            <Package size={16} className="text-gold-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-cream-100">Progreso del Pedido</h3>
            <p className="text-xs text-charcoal-400">
              {isDelivered ? 'Entregado' : `Fase actual: ${phases.find(p => p.key === currentPhase)?.name}`}
            </p>
          </div>
        </div>
        
        {/* Indicador de progreso */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-charcoal-400">
            {Math.round((phases.filter(p => p.status === 'completed').length / phases.length) * 100)}%
          </div>
          <div className="w-16 h-2 bg-charcoal-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-gold-500 transition-all duration-500"
              style={{ width: `${(phases.filter(p => p.status === 'completed').length / phases.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Fases */}
      <div className="relative">
        {/* Línea conectora - perfectamente centrada (36px = 24px centro círculo + 12px padding) */}
        <div className="absolute top-[1.75rem] left-9 right-9 h-0.5 bg-gradient-to-r from-emerald-500/30 via-gold-500/30 to-charcoal-700/50 z-0" />

        <div className="relative z-10 grid grid-cols-4 gap-4">
          {phases.map((phase, index) => (
            <div key={phase.key} className="flex flex-col items-center">
              {/* Círculo de fase mejorado */}
              <div className={`relative group transition-all duration-300 ${getPhaseBg(phase.status)} rounded-xl p-3`}>
                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-lg ${getPhaseColor(phase.status)} group-hover:scale-105`}>
                  {getPhaseIcon(phase.status)}
                </div>
                
                {/* Indicador numerado */}
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-charcoal-900 rounded-full flex items-center justify-center text-xs font-bold text-cream-200 border border-white/20">
                  {index + 1}
                </div>
              </div>
              
              {/* Información de fase */}
              <div className="mt-3 text-center">
                <p className="text-xs font-semibold text-cream-200">{phase.name}</p>
                <p className="text-[10px] text-charcoal-500 capitalize mt-1">{phase.status}</p>
              </div>

              {/* Flecha conectora */}
              {index < phases.length - 1 && (
                <ChevronRight 
                  size={16} 
                  className={`absolute top-6 -right-2 transition-colors duration-300 ${
                    phase.status === 'completed' ? 'text-emerald-400' : 
                    phase.status === 'active' ? 'text-gold-400' : 'text-charcoal-600'
                  }`} 
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Información de entrega */}
      {isDelivered && deliveredDate && (
        <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Check size={20} className="text-emerald-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-400">Pedido Entregado</p>
              <div className="flex items-center gap-4 mt-1">
                {deliveredDate && (
                  <div className="flex items-center gap-1 text-xs text-emerald-300">
                    <Calendar size={12} />
                    {new Date(deliveredDate).toLocaleDateString('es-CO')}
                  </div>
                )}
                {deliveredBy && (
                  <div className="flex items-center gap-1 text-xs text-emerald-300">
                    <User size={12} />
                    {deliveredBy}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leyenda optimizada */}
      <div className="mt-6 pt-4 border-t border-white/5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <span className="text-charcoal-400">Completada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gold-400 rounded-full animate-pulse"></div>
            <span className="text-charcoal-400">Activa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-charcoal-400 rounded-full"></div>
            <span className="text-charcoal-400">Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <span className="text-charcoal-400">Bloqueada</span>
          </div>
        </div>
      </div>
    </div>
  );
}
