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
    <section className="py-20 md:py-32 section-padding relative overflow-hidden">
      <div className="max-w-[90rem] mx-auto">

        {/* Label + nav row — thread visual */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between mb-12 md:mb-16"
        >
          <div className="section-rule">
            <span className="text-label uppercase text-cream-200/30 font-sans tracking-[0.2em]">
              Testimonios
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-label text-cream-200/20 font-mono mr-1">
              {String(current + 1).padStart(2, '0')}/{String(testimonials.length).padStart(2, '0')}
            </span>
            <button
              onClick={prev}
              className="w-9 h-9 flex items-center justify-center text-cream-200/25 hover:text-cream-200/70 transition-colors duration-400"
              style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '2px' }}
              aria-label="Anterior"
            >
              <ArrowLeft size={14} />
            </button>
            <button
              onClick={next}
              className="w-9 h-9 flex items-center justify-center text-cream-200/25 hover:text-cream-200/70 transition-colors duration-400"
              style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '2px' }}
              aria-label="Siguiente"
            >
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>

        {/* Quote */}
        <div className="relative min-h-[35vh] flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10"
            >
              <blockquote className="font-display text-display-md md:text-display-xl text-cream-100/90 max-w-5xl leading-[1.15] font-light">
                {testimonials[current].text}
              </blockquote>

              <div className="mt-8 md:mt-12 flex items-center gap-4">
                <div className="w-5 h-px" style={{ background: 'rgba(212,175,55,0.4)' }} />
                <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(212,175,55,0.5)' }} />
                <div>
                  <p className="text-sm font-sans text-cream-200/65">
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

        {/* Progress bar — thread visual */}
        <div className="mt-12 h-px relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <motion.div
            key={current}
            className="absolute top-0 left-0 h-full"
            style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.6), rgba(212,175,55,0.2))' }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 6, ease: 'linear' }}
          />
        </div>
      </div>
    </section>
  );
}
