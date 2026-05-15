'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const categories = [
  {
    num: '01',
    title: 'Diseño y creación',
    tagline: 'Lo que hacemos desde cero',
    services: [
      {
        title: 'Joyas personalizadas',
        desc: 'Si tienes una idea, la hacemos realidad. Nos describes lo que quieres y nosotros nos encargamos del diseño y la fabricación.',
      },
      {
        title: 'Venta de joyas exclusivas',
        desc: 'Tenemos piezas propias en oro, plata y piedras preciosas. Cada una hecha con cuidado, lista para llevar o regalar.',
      },
      {
        title: 'Diseño e impresión 3D',
        desc: 'Usamos modelado digital e impresión 3D para lograr formas que a mano serían muy difíciles. Ideal para piezas complejas o de alta precisión.',
      },
    ],
  },
  {
    num: '02',
    title: 'Todo sobre el oro',
    tagline: 'Todo lo que necesitas con tu oro en un solo lugar',
    services: [
      {
        title: 'Compra y venta de oro',
        desc: 'Compramos tu oro al precio del día y vendemos material de calidad. Sin rodeos, con precio justo y atención directa.',
      },
      {
        title: 'Refinamiento de oro',
        desc: 'Purificamos oro de cualquier ley hasta llevarlo a 24 quilates. Útil si tienes piezas viejas, chatarra o material mezclado.',
      },
      {
        title: 'Valuación de joyas',
        desc: 'Te decimos cuánto vale tu joya con un avalúo serio y documentado. Sirve para vender, asegurar o simplemente saber.',
      },
    ],
  },
  {
    num: '03',
    title: 'Piedras preciosas',
    tagline: 'Compra, venta y certificación con respaldo técnico',
    services: [
      {
        title: 'Compra y venta de piedras',
        desc: 'Trabajamos con esmeraldas, rubíes, diamantes y otras piedras. Si quieres comprar o vender, te asesoramos en cada paso.',
      },
      {
        title: 'Certificación de piedras',
        desc: 'Emitimos certificados que confirman qué es la piedra, de dónde viene y qué características tiene. Necesario si vas a venderla o asegurarla.',
      },
      {
        title: 'Engaste y desengaste',
        desc: 'Ponemos o quitamos piedras de cualquier pieza con precisión. Sin dañar el metal ni la piedra.',
      },
    ],
  },
  {
    num: '04',
    title: 'En el taller',
    tagline: 'Reparaciones, acabados y manufactura',
    services: [
      {
        title: 'Reparación de joyas',
        desc: 'Arreglamos cierres, soldamos, cambiamos piezas rotas o desgastadas. Si la joya tiene arreglo, aquí la recuperamos.',
      },
      {
        title: 'Corte y grabado láser',
        desc: 'Grabamos texto, fechas o diseños con láser sobre metales y piedras. Perfecto para personalizar una pieza con algo especial.',
      },
      {
        title: 'Fundición de metales',
        desc: 'Fundimos oro, plata y otros metales para crear piezas desde cero o reutilizar material que ya no usas.',
      },
    ],
  },
  {
    num: '05',
    title: 'También hacemos',
    tagline: 'Servicios adicionales que complementan nuestra oferta',
    services: [
      {
        title: 'Tejido de pulseras',
        desc: 'Elaboramos pulseras tejidas en oro y plata a mano. Cada una sale distinta, con el carácter de lo hecho con paciencia.',
      },
      {
        title: 'Entrega y recogida en Bogotá',
        desc: 'Si no puedes venir al taller, nosotros vamos a ti. Recogemos y entregamos tus joyas en Bogotá con seguridad y discreción.',
      },
    ],
  },
];

function ServiceCard({
  service,
  index,
}: {
  service: { title: string; desc: string };
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const isEven = index % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group cursor-pointer"
      onClick={() => setOpen(!open)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        className="relative flex flex-col justify-between min-h-[88px] p-5 md:p-6 rounded-xl transition-all duration-500"
        style={{
          background: open
            ? 'rgba(30,28,24,0.95)'
            : isEven
              ? 'rgba(20,19,17,0.85)'
              : 'rgba(14,13,12,0.85)',
          border: open
            ? '1px solid rgba(212,175,55,0.4)'
            : '1px solid rgba(255,255,255,0.07)',
          borderLeft: open
            ? '2px solid rgba(212,175,55,0.7)'
            : isEven
              ? '2px solid rgba(212,175,55,0.12)'
              : '2px solid rgba(212,175,55,0.06)',
          boxShadow: open ? '0 8px 32px rgba(212,175,55,0.08)' : 'none',
        }}
      >
        {/* Service number — decorative top-right */}
        <span
          className="absolute top-4 right-4 font-mono text-[10px] transition-colors duration-500"
          style={{ color: open ? 'rgba(212,175,55,0.5)' : 'rgba(242,240,237,0.12)' }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Title row */}
        <div className="flex items-start justify-between gap-4 pr-6">
          <h4
            className="font-sans font-semibold text-sm md:text-base leading-snug transition-colors duration-500"
            style={{ color: open ? 'rgba(212,175,55,1)' : 'rgba(242,240,237,0.9)' }}
          >
            {service.title}
          </h4>
        </div>

        {/* Divider — visible when open */}
        <div
          className="transition-all duration-300 overflow-hidden"
          style={{ maxHeight: open ? '1px' : '0', marginTop: open ? 12 : 0, marginBottom: open ? 12 : 0 }}
        >
          <div className="h-px w-full" style={{ background: 'rgba(212,175,55,0.15)' }} />
        </div>

        {/* Description — expands on hover/tap */}
        <AnimatePresence>
          {open && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="text-xs text-cream-200/45 leading-relaxed font-sans overflow-hidden"
            >
              {service.desc}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function CategoryCard({ cat, index }: { cat: (typeof categories)[number]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group h-full"
    >
      <div
        className="relative p-6 md:p-8 rounded-2xl transition-all duration-500 h-full flex flex-col"
        style={{
          background: 'rgba(20,19,17,0.85)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 -1px 0 rgba(0,0,0,0.4) inset',
        }}
      >
        {/* Número decorativo */}
        <span
          className="absolute top-4 right-4 font-mono text-[10px] text-gold-500/30"
        >
          {cat.num}
        </span>

        {/* Título */}
        <h3 className="font-display text-display-md text-cream-100 mb-3 pr-8">
          {cat.title}
        </h3>

        {/* Tagline */}
        <p className="text-xs text-cream-200/25 font-sans uppercase tracking-[0.15em] mb-6">
          {cat.tagline}
        </p>

        {/* Lista de servicios visible */}
        <ul className="space-y-3">
          {cat.services.map((service, i) => (
            <li
              key={service.title}
              className="flex items-start gap-3 pb-3"
              style={{ borderBottom: i < cat.services.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
            >
              <span className="text-gold-500/40 text-[10px] shrink-0 mt-1">—</span>
              <div className="flex-1">
                <h4 className="text-sm font-sans font-semibold text-cream-200/80 mb-1">
                  {service.title}
                </h4>
                <p className="text-xs text-cream-200/35 font-sans leading-relaxed">
                  {service.desc}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

function CategoryBlock({ cat }: { cat: (typeof categories)[number] }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.9', 'start 0.3'],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [0.15, 1]);

  return (
    <motion.div ref={ref} style={{ opacity }} className="py-12 border-b border-cream-200/[0.06]">
      {/* Category header */}
      <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-8 mb-8">
        <span className="font-mono text-label text-gold-500/50 shrink-0">{cat.num}</span>
        <div className="flex-1">
          <h3 className="font-display text-display-md text-cream-100 mb-1">
            {cat.title}
          </h3>
          <p className="text-xs uppercase tracking-[0.15em] text-cream-200/25 font-sans">
            {cat.tagline}
          </p>
        </div>
      </div>

      {/* Service cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cat.services.map((service, i) => (
          <ServiceCard key={service.title} service={service} index={i} />
        ))}
      </div>
    </motion.div>
  );
}

function HomeCategoryCard({ cat, index }: { cat: (typeof categories)[number]; index: number }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);

  return (
    <motion.div
      ref={ref}
      style={{ y }}
    >
      <Link href="/servicios" className="group block">
        {/* Card — mismo aspect ratio y estilo que Colección */}
        <div
          className="relative aspect-[3/4] overflow-hidden mb-5 group-hover:shadow-2xl group-hover:shadow-gold-500/20 active:opacity-80 transition-all duration-500"
          style={{
            background: 'linear-gradient(145deg, #1A1A1A, #0D0D0D)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 -1px 0 rgba(0,0,0,0.4) inset',
          }}
        >
          {/* Radial accent */}
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 100%, rgba(212,175,55,0.07), transparent)' }}
          />

          {/* Número decorativo gigante */}
          <span
            className="absolute -bottom-4 -right-2 font-display text-[10rem] leading-none select-none pointer-events-none"
            style={{ color: 'rgba(242,240,237,0.025)' }}
          >
            {cat.num}
          </span>

          {/* Título centrado */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <span className="font-mono text-[10px] text-gold-500/40 tracking-[0.2em] uppercase mb-4 block">
              {cat.num}
            </span>
            <h3 className="font-display text-display-md text-cream-100 group-hover:text-gold-400 transition-colors duration-500 leading-tight">
              {cat.title}
            </h3>
            <p className="mt-3 text-[11px] text-cream-200/30 font-sans tracking-wide leading-relaxed max-w-[140px]">
              {cat.tagline}
            </p>
          </div>

          {/* Top border accent */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px] group-hover:h-[3px] transition-all duration-500"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)' }}
          />

        </div>

        {/* Services list below */}
        <ul className="mt-1 space-y-1.5">
          {cat.services.map((service) => (
            <li key={service.title} className="flex items-baseline gap-2">
              <span className="text-gold-500/30 text-[10px] shrink-0">—</span>
              <span className="text-xs text-cream-200/35 font-sans leading-snug group-hover:text-cream-200/50 transition-colors duration-500">
                {service.title}
              </span>
            </li>
          ))}
        </ul>
      </Link>
    </motion.div>
  );
}

function HomeCategoryRow({ cat, index }: { cat: (typeof categories)[number]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
    >
      <Link
        href="/servicios"
        className="group flex items-baseline gap-6 md:gap-10 py-5 md:py-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Number */}
        <span className="font-mono text-[11px] text-gold-500/35 tracking-[0.15em] shrink-0 w-8">
          {cat.num}
        </span>

        {/* Title */}
        <h3 className="font-display text-display-md text-cream-100/85 group-hover:text-gold-400 transition-colors duration-400 flex-1 leading-none">
          {cat.title}
        </h3>

        {/* Tagline — hidden on mobile */}
        <p className="hidden md:block text-xs text-cream-200/30 font-sans tracking-wide max-w-[260px] leading-relaxed flex-1">
          {cat.tagline}
        </p>

        {/* Services pills */}
        <div className="hidden lg:flex items-center gap-2 flex-wrap max-w-[300px]">
          {cat.services.map((s) => (
            <span
              key={s.title}
              className="text-[10px] font-sans text-cream-200/25 uppercase tracking-[0.1em] px-2 py-1 group-hover:text-cream-200/45 transition-colors duration-400"
              style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '2px' }}
            >
              {s.title}
            </span>
          ))}
        </div>

        {/* Arrow */}
        <ArrowUpRight
          size={16}
          className="text-cream-200/15 group-hover:text-gold-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-400 shrink-0"
        />
      </Link>
    </motion.div>
  );
}

export function ProcessSection() {
  return (
    <section id="servicios" className="py-24 md:py-34 px-5 sm:px-8 md:px-12 lg:px-16 relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto">
        {/* Category cards — 2 filas x 3 columnas en sm+, header integrado en primer slot */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">
          {/* Header integrado — mobile: texto compacto, sm+: texto completo con descripción */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7 }}
          >
            <div className="aspect-[3/4] flex flex-col justify-center py-2 sm:py-3">
              <div className="mb-auto">
                <div className="section-rule mb-3 sm:mb-4">
                  <span className="text-[10px] uppercase text-cream-200/30 font-sans tracking-[0.2em]">
                    Servicios
                  </span>
                </div>
                <h2
                  className="font-display text-cream-100 leading-[1.05]"
                  style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)' }}
                >
                  Lo que <br />
                  <span className="text-gold-400 font-semibold">hacemos</span>
                </h2>
                <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-cream-200/40 font-sans leading-relaxed">
                  Fabricamos, reparamos, valuamos y mucho más. Si tiene que ver con oro, plata o piedras preciosas, nosotros lo hacemos.
                </p>
              </div>
              <Link
                href="/servicios"
                className="inline-flex items-center gap-1 self-start text-[9px] sm:text-[10px] uppercase tracking-[0.16em] text-gold-400 font-sans px-3 py-1.5"
                style={{ border: '1px solid rgba(212,175,55,0.4)', borderRadius: '100px' }}
              >
                Ver todos <ArrowUpRight size={9} />
              </Link>
            </div>
          </motion.div>

          {categories.map((cat, i) => (
            <HomeCategoryCard key={cat.num} cat={cat} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function ServicesFullSection() {
  return (
    <section className="py-24 md:py-34 section-padding relative overflow-hidden">
      <div className="max-w-[90rem] mx-auto px-6 md:px-12 lg:px-16">
        {/* Grid con título integrado */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Hero — primera posición, sin card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-1 flex flex-col justify-center p-6 md:p-8"
          >
            <span className="text-label uppercase text-gold-500/50 font-sans block mb-4 tracking-[0.2em]">
              Servicios
            </span>
            <h1 className="font-display text-display-xl text-cream-100 mb-4">
              Lo que <br />
              <span className="text-gold-400 font-semibold">hacemos</span>
            </h1>
            <p className="text-sm text-cream-200/50 font-sans leading-relaxed">
              Diseño personalizado, compra y venta de oro, piedras preciosas, reparaciones y más.
              Cada servicio con la calidad y atención que tu joya merece.
            </p>
          </motion.div>

          {/* Services cards */}
          {categories.map((cat, i) => (
            <CategoryCard key={cat.num} cat={cat} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
