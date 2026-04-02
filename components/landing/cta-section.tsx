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
        className="max-w-[90rem] mx-auto relative text-center"
      >
        <span className="text-label uppercase text-cream-200/20 font-sans block mb-8">
          Comienza tu historia
        </span>

        <h2 className="font-serif text-display-xl md:text-hero-sub lg:text-hero text-cream-100 mx-auto">
          Tu pieza
          <br />
          <span className="italic text-outline-gold">perfecta</span>{' '}
          <span className="text-gold-400">te espera</span>
        </h2>

        <p className="mt-8 md:mt-10 text-sm md:text-base text-cream-200/40 max-w-md mx-auto leading-relaxed font-sans">
          Cada joya que creamos es un reflejo de quien la lleva.
          Diseñada exclusivamente para ti.
        </p>

        <div className="mt-10 md:mt-14 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/catalogo" className="btn-pill group">
            Explorar colección
            <ArrowRight
              size={14}
              className="group-hover:translate-x-1 transition-transform duration-500"
            />
          </Link>
          <Link href="/seguimiento" className="btn-pill-outline">
            Rastrear pedido
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
