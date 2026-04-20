'use client';

import { useState } from 'react';
import { Calculator, Info } from 'lucide-react';

interface JewelryFormData {
  metalType: 'gold' | 'silver';
  estimatedWeightGr: string;
  clientProvidesMetal: boolean;
  clientMetalPurity: string;
  clientMetalWeightGr: string;
  clientGoldColor: 'yellow' | 'rose' | 'white' | '';
}

interface JewelryCreationFormProps {
  data: JewelryFormData;
  onChange: (data: JewelryFormData) => void;
}

export default function JewelryCreationForm({ data, onChange }: JewelryCreationFormProps) {
  const updateField = (field: keyof JewelryFormData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6 bg-charcoal-800/50 border border-white/5 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-medium text-cream-100">Datos Técnicos de Joyería</h3>
        <span className="text-xs text-gold-500">Fase 1</span>
      </div>

      {/* Tipo de Metal */}
      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
          Tipo de metal *
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'gold', label: 'Oro' },
            { value: 'silver', label: 'Plata' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateField('metalType', opt.value)}
              className={`px-4 py-2.5 rounded-md text-sm border transition-all ${
                data.metalType === opt.value
                  ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
                  : 'bg-charcoal-900 border-white/5 text-charcoal-300 hover:border-white/10'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Peso Estimado */}
      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
          Peso estimado (gr) *
        </label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={data.estimatedWeightGr}
          onChange={(e) => updateField('estimatedWeightGr', e.target.value)}
          placeholder="15.50"
          className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
        />
      </div>

      {/* ¿Cliente entrega metal? */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs tracking-widest uppercase text-charcoal-400">
            ¿El cliente entrega material?
          </label>
          <button
            type="button"
            onClick={() => updateField('clientProvidesMetal', !data.clientProvidesMetal)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              data.clientProvidesMetal ? 'bg-gold-500' : 'bg-charcoal-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                data.clientProvidesMetal ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p className="text-[11px] text-charcoal-500">
          {data.clientProvidesMetal 
            ? 'El cliente aporta metal para la pieza' 
            : 'La joyería provee todo el material'
          }
        </p>
      </div>

      {/* Datos del metal del cliente (condicional) */}
      {data.clientProvidesMetal && (
        <div className="space-y-4 border-t border-white/5 pt-4">
          <h4 className="text-xs font-medium text-charcoal-300">Material del Cliente</h4>
          
          {/* Pureza del metal del cliente */}
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
              Pureza (ley) *
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="24"
              value={data.clientMetalPurity}
              onChange={(e) => updateField('clientMetalPurity', e.target.value)}
              placeholder={data.metalType === 'gold' ? '18.5' : '0.925'}
              className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
            />
            <p className="text-[11px] text-charcoal-500 mt-1">
              {data.metalType === 'gold' ? 'Ej: 18.5 para 18K, 24 para 24K' : 'Ej: 0.925 para 925'}
            </p>
          </div>

          {/* Peso del metal del cliente */}
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
              Peso (gr) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={data.clientMetalWeightGr}
              onChange={(e) => updateField('clientMetalWeightGr', e.target.value)}
              placeholder="8.00"
              className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
            />
          </div>

          {/* Color del oro (solo si es oro) */}
          {data.metalType === 'gold' && (
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                Color del oro *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'yellow', label: 'Amarillo' },
                  { value: 'rose', label: 'Rosado' },
                  { value: 'white', label: 'Blanco' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('clientGoldColor', opt.value)}
                    className={`px-3 py-2 rounded-md text-xs border transition-all ${
                      data.clientGoldColor === opt.value
                        ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
                        : 'bg-charcoal-900 border-white/5 text-charcoal-300 hover:border-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Información de ayuda */}
      <div className="bg-charcoal-900/50 border border-white/5 rounded-md p-3">
        <div className="flex items-start gap-2">
          <Info size={14} className="text-gold-500 mt-0.5" />
          <div className="text-[11px] text-charcoal-400">
            <p className="mb-1">Estos datos son técnicos del pedido:</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>El peso estimado se usa para planificación</li>
              <li>Si el cliente entrega material, se registrará en abonos</li>
              <li>Los datos pueden ajustarse durante el proceso</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
