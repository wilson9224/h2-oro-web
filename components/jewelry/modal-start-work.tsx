'use client';

import { useState, useEffect } from 'react';
import { X, Calculator, Scale, User, Calendar, Camera, AlertCircle } from 'lucide-react';
import { 
  calcApproxGoldLaw, 
  calcMaterialSurplus, 
  calcTotalMetalWeight,
  formatPurity,
  formatWeight,
  getGoldColorLabel
} from '@/lib/jewelry/calculations';
import { validateStartWork } from '@/lib/jewelry/validations';

interface ModalStartWorkProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StartWorkData) => Promise<void>;
  orderId: string;
  jewelryData: {
    metalType: 'gold' | 'silver';
    estimatedWeightGr: number;
    clientProvidesMetal: boolean;
    clientMetalPurity?: number;
    clientMetalWeightGr?: number;
  };
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    role?: string;
  }>;
}

interface StartWorkData {
  // Fase 2: Inicio trabajo (material joyería)
  jewelryMetalPurity: number;
  jewelryMetalWeightGr: number;
  jewelryGoldColor?: 'yellow' | 'rose' | 'white';
  includesStones: boolean;
  stoneType?: string;
  stoneCount?: number;
  stoneWeightGr?: number;
  deliveredByUserId: string;
  receivedByUserId: string;
  materialDeliveryDate: string;
}

export default function ModalStartWork({ 
  isOpen, 
  onClose, 
  onSubmit, 
  orderId, 
  jewelryData,
  users 
}: ModalStartWorkProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<StartWorkData>({
    jewelryMetalPurity: jewelryData.metalType === 'gold' ? 18.5 : 0.925,
    jewelryMetalWeightGr: jewelryData.estimatedWeightGr,
    jewelryGoldColor: jewelryData.metalType === 'gold' ? 'yellow' : undefined,
    includesStones: false,
    stoneType: '',
    stoneCount: undefined,
    stoneWeightGr: undefined,
    deliveredByUserId: '',
    receivedByUserId: '',
    materialDeliveryDate: new Date().toISOString().split('T')[0],
  });

  // Cálculos automáticos usando librerías
  const calculatedValues = {
    approxGoldLaw: jewelryData.metalType === 'gold' 
      ? calcApproxGoldLaw(
          jewelryData.clientProvidesMetal ? jewelryData.clientMetalPurity || null : null,
          jewelryData.clientProvidesMetal ? jewelryData.clientMetalWeightGr || null : null,
          formData.jewelryMetalPurity,
          formData.jewelryMetalWeightGr
        )
      : null,
    materialSurplusGr: calcMaterialSurplus(
      calcTotalMetalWeight(
        jewelryData.clientProvidesMetal ? jewelryData.clientMetalWeightGr || null : null,
        formData.jewelryMetalWeightGr
      ),
      jewelryData.estimatedWeightGr
    ),
    totalMetalWeightGr: calcTotalMetalWeight(
      jewelryData.clientProvidesMetal ? jewelryData.clientMetalWeightGr || null : null,
      formData.jewelryMetalWeightGr
    ),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validaciones usando librería
      const validation = validateStartWork(formData, jewelryData);
      
      if (!validation.isValid) {
        throw new Error(validation.error || 'Error de validación');
      }

      // Si hay advertencia, mostrarla pero continuar
      if (validation.warning) {
        console.warn('Advertencia:', validation.warning);
      }

      await onSubmit(formData);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar trabajo');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof StartWorkData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  console.log('Usuarios recibidos en modal:', users);
  console.log('Total usuarios:', users.length);
  
  const joyeros = users.filter(u => u.role === 'jeweler');
  const managers = users.filter(u => u.role === 'manager');
  const designers = users.filter(u => u.role === 'designer');
  
  console.log('Joyeros encontrados:', joyeros);
  console.log('Managers encontrados:', managers);
  console.log('Designers encontrados:', designers);

  return (
    <div className="fixed inset-0 bg-charcoal-900/95 flex items-center justify-center z-50 p-4">
      <div className="bg-charcoal-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="text-lg font-medium text-cream-100">Iniciar Trabajo</h2>
            <p className="text-sm text-charcoal-400">Fase 2: Entrega de material al joyero</p>
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

          {/* Metal Joyería */}
          <div>
            <h3 className="text-sm font-medium text-cream-100 mb-4 flex items-center gap-2">
              <Scale size={16} className="text-gold-500" />
              Metal de Joyería
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                  Pureza {jewelryData.metalType === 'gold' ? '(K)' : '(Ley)'} *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={jewelryData.metalType === 'gold' ? 24 : 1}
                  value={formData.jewelryMetalPurity}
                  onChange={(e) => updateField('jewelryMetalPurity', parseFloat(e.target.value))}
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
                />
                <p className="text-[11px] text-charcoal-500 mt-1">
                  {jewelryData.metalType === 'gold' ? 'Ej: 18.5 para 18K' : 'Ej: 0.925 para 925'}
                </p>
              </div>
              
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                  Peso (gr) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.jewelryMetalWeightGr}
                  onChange={(e) => updateField('jewelryMetalWeightGr', parseFloat(e.target.value))}
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
                />
              </div>
              
              {jewelryData.metalType === 'gold' && (
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                    Color del oro *
                  </label>
                  <select
                    value={formData.jewelryGoldColor}
                    onChange={(e) => updateField('jewelryGoldColor', e.target.value)}
                    className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="yellow">{getGoldColorLabel('yellow')}</option>
                    <option value="rose">{getGoldColorLabel('rose')}</option>
                    <option value="white">{getGoldColorLabel('white')}</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Piedras */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-cream-100 flex items-center gap-2">
                <Calculator size={16} className="text-gold-500" />
                Piedras
              </h3>
              <button
                type="button"
                onClick={() => updateField('includesStones', !formData.includesStones)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.includesStones ? 'bg-gold-500' : 'bg-charcoal-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.includesStones ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {formData.includesStones && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                    Tipo de piedras *
                  </label>
                  <input
                    type="text"
                    value={formData.stoneType}
                    onChange={(e) => updateField('stoneType', e.target.value)}
                    placeholder="Ej: Diamantes, Zafiros"
                    className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
                  />
                </div>
                
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.stoneCount || ''}
                    onChange={(e) => updateField('stoneCount', parseInt(e.target.value))}
                    className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
                  />
                </div>
                
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                    Peso total (gr) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.stoneWeightGr || ''}
                    onChange={(e) => updateField('stoneWeightGr', parseFloat(e.target.value))}
                    className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Campos Calculados */}
          <div className="bg-charcoal-900/50 border border-white/5 rounded-lg p-4">
            <h3 className="text-sm font-medium text-cream-100 mb-4 flex items-center gap-2">
              <Calculator size={16} className="text-gold-500" />
              Campos Calculados
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              {calculatedValues.approxGoldLaw && (
                <div>
                  <p className="text-xs text-charcoal-500 mb-1">Ley aprox. oro</p>
                  <p className="text-cream-200 font-mono bg-charcoal-800 px-2 py-1 rounded">
                    {formatPurity(calculatedValues.approxGoldLaw, 'gold')}
                  </p>
                </div>
              )}
              
              <div>
                <p className="text-xs text-charcoal-500 mb-1">Excedente material</p>
                <p className={`font-mono px-2 py-1 rounded ${
                  calculatedValues.materialSurplusGr < 0 
                    ? 'text-orange-400 bg-orange-500/10' 
                    : 'text-emerald-400 bg-emerald-500/10'
                }`}>
                  {calculatedValues.materialSurplusGr > 0 ? '+' : ''}{formatWeight(calculatedValues.materialSurplusGr)}
                </p>
              </div>
              
              <div>
                <p className="text-xs text-charcoal-500 mb-1">Peso total metal</p>
                <p className="text-cream-200 font-mono bg-charcoal-800 px-2 py-1 rounded">
                  {formatWeight(calculatedValues.totalMetalWeightGr)}
                </p>
              </div>
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
                  Entregado por *
                </label>
                <select
                  value={formData.deliveredByUserId}
                  onChange={(e) => updateField('deliveredByUserId', e.target.value)}
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
                  Recibido por *
                </label>
                <select
                  value={formData.receivedByUserId}
                  onChange={(e) => updateField('receivedByUserId', e.target.value)}
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
                >
                  <option value="">Seleccionar...</option>
                  {joyeros.map((user) => (
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
                  value={formData.materialDeliveryDate}
                  onChange={(e) => updateField('materialDeliveryDate', e.target.value)}
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
                Arrastra fotos aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-charcoal-500">
                Formatos: JPG, PNG. Máximo 10MB por archivo.
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
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-charcoal-900 border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Calendar size={16} />
                  Iniciar Trabajo
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
