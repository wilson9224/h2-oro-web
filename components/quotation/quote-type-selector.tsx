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
        <h2 className="text-2xl font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.95)' }}>Nueva Cotización</h2>
        <p className="text-sm mt-2 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
          Selecciona el tipo de cotización para aplicar los precios correctos
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg">
        <button
          onClick={() => onSelect('client')}
          className="group flex flex-col items-center gap-4 p-8 rounded-xl transition-all duration-200 font-sans-custom"
          style={{ background: 'rgba(8,8,8,1)', border: '1px solid rgba(255,255,255,0.05)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.4)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)'}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center transition-colors" style={{ background: 'rgba(212,175,55,0.1)' }}>
            <Users size={28} style={{ color: 'rgba(212,175,55,0.9)' }} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold transition-colors" style={{ color: 'rgba(242,240,237,0.8)' }}>
              Cliente Final
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(242,240,237,0.4)' }}>
              Precios de venta al público
            </p>
          </div>
        </button>

        <button
          onClick={() => onSelect('jeweler')}
          className="group flex flex-col items-center gap-4 p-8 rounded-xl transition-all duration-200 font-sans-custom"
          style={{ background: 'rgba(8,8,8,1)', border: '1px solid rgba(255,255,255,0.05)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.4)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)'}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center transition-colors" style={{ background: 'rgba(212,175,55,0.1)' }}>
            <Hammer size={28} style={{ color: 'rgba(212,175,55,0.9)' }} />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold transition-colors" style={{ color: 'rgba(242,240,237,0.8)' }}>
              Joyero
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(242,240,237,0.4)' }}>
              Precios especiales para joyeros
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
