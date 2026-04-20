'use client';

import { Users, Hammer } from 'lucide-react';
import type { QuoteType } from '@/lib/quotation/types';

interface Props {
  onSelect: (type: QuoteType) => void;
}

export default function QuoteTypeSelector({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-serif text-cream-100">Nueva Cotización</h2>
        <p className="text-sm text-charcoal-400 mt-2">
          Selecciona el tipo de cotización para aplicar los precios correctos
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg">
        <button
          onClick={() => onSelect('client')}
          className="group flex flex-col items-center gap-4 p-8 rounded-xl bg-charcoal-800 border border-white/5 hover:border-gold-500/40 hover:bg-gold-500/5 transition-all duration-200"
        >
          <div className="w-16 h-16 rounded-full bg-gold-500/10 flex items-center justify-center group-hover:bg-gold-500/20 transition-colors">
            <Users size={28} className="text-gold-400" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-cream-200 group-hover:text-gold-300 transition-colors">
              Cliente Final
            </p>
            <p className="text-xs text-charcoal-400 mt-1">
              Precios de venta al público
            </p>
          </div>
        </button>

        <button
          onClick={() => onSelect('jeweler')}
          className="group flex flex-col items-center gap-4 p-8 rounded-xl bg-charcoal-800 border border-white/5 hover:border-gold-500/40 hover:bg-gold-500/5 transition-all duration-200"
        >
          <div className="w-16 h-16 rounded-full bg-gold-500/10 flex items-center justify-center group-hover:bg-gold-500/20 transition-colors">
            <Hammer size={28} className="text-gold-400" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-cream-200 group-hover:text-gold-300 transition-colors">
              Joyero
            </p>
            <p className="text-xs text-charcoal-400 mt-1">
              Precios especiales para joyeros
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
