'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const steps = [
  {
    num: '01',
    title: 'Diseño',
    desc: 'Trabajamos contigo para crear un diseño único. Bocetos, renders 3D, cada detalle pensado.',
  },
  {
    num: '02',
    title: 'Selección',
    desc: 'Oro 18K certificado y gemas seleccionadas a mano. Solo lo mejor llega a tu pieza.',
  },
  {
    num: '03',
    title: 'Creación',
    desc: 'Maestros orfebres colombianos dan vida a tu joya con técnicas artesanales de precisión.',
  },
  {
    num: '04',
    title: 'Entrega',
    desc: 'Empaque de lujo, certificado de autenticidad, y una experiencia que recordarás siempre.',
  },
];

function StepRow({ step }: { step: (typeof steps)[number] }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.9', 'start 0.3'],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [0.15, 1]);
  const x = useTransform(scrollYProgress, [0, 1], [40, 0]);

  return (
    <motion.div
      ref={ref}
      style={{ opacity, x }}
      className="group relative grid grid-cols-12 gap-4 md:gap-8 items-baseline py-10 md:py-14 border-b border-cream-200/[0.06]"
    >
      {/* Number — oversized, overlapping */}
      <div className="col-span-2 md:col-span-1">
        <span className="font-mono text-label text-cream-200/20">
          {step.num}
        </span>
      </div>

      {/* Title — large serif */}
      <div className="col-span-10 md:col-span-4">
        <h3 className="font-serif text-display-md text-cream-100 group-hover:text-gold-400 transition-colors duration-700">
          {step.title}
        </h3>
      </div>

      {/* Description — pushed right */}
      <div className="col-span-12 md:col-span-5 md:col-start-7">
        <p className="text-sm md:text-base text-cream-200/40 leading-relaxed font-sans">
          {step.desc}
        </p>
      </div>

      {/* Oversized decorative number behind */}
      <span
        className="absolute -top-6 right-0 font-serif text-[8rem] md:text-[12rem] leading-none text-cream-200/[0.02] select-none pointer-events-none hidden md:block"
        aria-hidden
      >
        {step.num}
      </span>
    </motion.div>
  );
}

export function ProcessSection() {
  return (
    <section className="py-24 md:py-34 section-padding relative overflow-hidden">
      <div className="max-w-[90rem] mx-auto">
        {/* Header — left-aligned, asymmetric */}
        <div className="mb-16 md:mb-24 max-w-2xl">
          <span className="text-label uppercase text-cream-200/25 font-sans block mb-4">
            Proceso
          </span>
          <h2 className="font-serif text-display-xl text-cream-100">
            Del sueño <br />
            <span className="italic text-outline">a la realidad</span>
          </h2>
        </div>

        {/* Steps list — editorial rows */}
        <div className="relative">
          {/* Top border */}
          <div className="h-px bg-cream-200/[0.06]" />
          {steps.map((step) => (
            <StepRow key={step.num} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}
