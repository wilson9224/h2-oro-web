'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const testimonials = [
  {
    name: 'María Alejandra',
    piece: 'Anillo de compromiso',
    text: 'Desde el primer boceto hasta la entrega, la experiencia fue impecable. Mi anillo es exactamente lo que soñé.',
  },
  {
    name: 'Carlos Andrés',
    piece: 'Colección pulseras',
    text: 'La calidad del oro y la artesanía son extraordinarias. Un acabado que solo se logra con verdaderos maestros.',
  },
  {
    name: 'Valentina Restrepo',
    piece: 'Aretes & collar a medida',
    text: 'H2 Oro transformó mi idea en una realidad que superó todas mis expectativas. Simplemente perfecto.',
  },
];

export function Testimonials() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(
    () => setCurrent((c) => (c === testimonials.length - 1 ? 0 : c + 1)),
    [],
  );
  const prev = () =>
    setCurrent((c) => (c === 0 ? testimonials.length - 1 : c - 1));

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section className="py-28 md:py-40 section-padding relative overflow-hidden">
      <div className="max-w-[90rem] mx-auto">
        {/* Label + nav row */}
        <div className="flex items-center justify-between mb-16 md:mb-24">
          <span className="text-label uppercase text-cream-200/25 font-sans">
            Testimonios
          </span>
          <div className="flex items-center gap-3">
            <span className="text-label text-cream-200/20 font-mono mr-2">
              {String(current + 1).padStart(2, '0')}/{String(testimonials.length).padStart(2, '0')}
            </span>
            <button
              onClick={prev}
              className="w-10 h-10 rounded-full border border-cream-200/10 flex items-center justify-center text-cream-200/30 hover:text-cream-200 hover:border-cream-200/30 transition-all duration-500"
              aria-label="Anterior"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={next}
              className="w-10 h-10 rounded-full border border-cream-200/10 flex items-center justify-center text-cream-200/30 hover:text-cream-200 hover:border-cream-200/30 transition-all duration-500"
              aria-label="Siguiente"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Quote — cinematic, oversized */}
        <div className="relative min-h-[40vh] flex items-center">
          {/* Decorative oversized quote mark */}
          <span
            className="absolute -top-10 -left-4 md:-left-8 font-serif text-[15rem] md:text-[22rem] leading-none text-cream-200/[0.03] select-none pointer-events-none"
            aria-hidden
          >
            &ldquo;
          </span>

          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10"
            >
              <blockquote className="font-serif text-display-md md:text-display-xl text-cream-100 max-w-5xl leading-[1.15]">
                {testimonials[current].text}
              </blockquote>

              <div className="mt-10 md:mt-14 flex items-center gap-4">
                <div className="w-px h-8 bg-gold-500/30" />
                <div>
                  <p className="text-sm font-sans text-cream-200/70">
                    {testimonials[current].name}
                  </p>
                  <p className="text-label uppercase text-cream-200/25 font-sans mt-1">
                    {testimonials[current].piece}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="mt-16 h-px bg-cream-200/[0.06] relative overflow-hidden">
          <motion.div
            key={current}
            className="absolute top-0 left-0 h-full bg-gold-500/40"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 6, ease: 'linear' }}
          />
        </div>
      </div>
    </section>
  );
}
