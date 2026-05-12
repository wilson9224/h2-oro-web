'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function CtaSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.92, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.4], [0, 1]);

  return (
    <section
      ref={ref}
      className="py-32 md:py-48 section-padding relative overflow-hidden"
    >
      {/* Ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60vw] h-[40vw] rounded-full bg-gold-500/[0.04] blur-[150px] pointer-events-none" />

      <motion.div
        style={{ scale, opacity }}
        className="max-w-[90rem] mx-auto relative"
      >
        {/* Thread visual — section-rule centrado */}
        <div className="flex justify-center mb-10">
          <div className="section-rule">
            <span className="text-label uppercase text-cream-200/25 font-sans tracking-[0.2em]">
              Comienza tu historia
            </span>
          </div>
        </div>

        <h2 className="font-display text-display-xl md:text-hero-sub text-cream-100 text-center max-w-3xl mx-auto leading-[1.05]">
          Cuéntanos tu idea.
          <br />
          <span className="text-gold-400 font-semibold">Nosotros la hacemos joya.</span>
        </h2>

        <p className="mt-8 text-sm md:text-base text-cream-200/40 max-w-sm mx-auto leading-relaxed font-sans text-center">
          Desde el boceto hasta la entrega, cada pieza es hecha a medida en nuestro taller en Bogotá.
        </p>

        {/* CTA row — thread visual: línea + botones */}
        <div className="mt-10 md:mt-12 flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link href="/catalogo" className="btn-pill group">
            Explorar colección
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-500" />
          </Link>
          <Link href="/seguimiento" className="btn-pill-outline">
            Rastrear pedido
          </Link>
        </div>

        {/* Bottom ornament — thread visual */}
        <div className="mt-14 flex items-center justify-center gap-3">
          <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.25))' }} />
          <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(212,175,55,0.4)' }} />
          <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.25), transparent)' }} />
        </div>
      </motion.div>
    </section>
  );
}
