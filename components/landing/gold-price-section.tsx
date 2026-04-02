'use client';

import { Motion } from '@/components/ui/motion';
import { GoldPriceTicker } from './gold-price-ticker';

export function GoldPriceSection() {
  return (
    <section className="py-10 md:py-14 section-padding border-y border-gold-500/10 bg-charcoal-800/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Motion variant="fadeUp">
            <p className="text-xs tracking-[0.2em] uppercase text-gold-500/60 mb-1">
              Precio del oro hoy
            </p>
            <p className="text-sm text-charcoal-300">
              Cotización actualizada para compra de oro
            </p>
          </Motion>

          <Motion variant="fadeUp" delay={0.15}>
            <GoldPriceTicker />
          </Motion>
        </div>
      </div>
    </section>
  );
}
