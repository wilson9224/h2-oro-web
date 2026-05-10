'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const collections = [
  { title: 'Anillos', tagline: 'Tu historia, forjada en oro', num: '01', image: '/collections/home-anillos.png' },
  { title: 'Collares', tagline: 'Elegancia que enmarca', num: '02', image: '/collections/home-collares.png' },
  { title: 'Pulseras', tagline: 'El complemento que faltaba', num: '03', image: '/collections/home-pulseras.png' },
  { title: 'Aretes', tagline: 'Brillo que cautiva', num: '04', image: '/collections/home-aretes.png' },
  { title: 'Dijes', tagline: 'Detalles que cuentan', num: '05', image: '/collections/home-dijes.png' },
];

const GRADIENTS = [
  'from-charcoal-800 to-charcoal-900',
  'from-charcoal-700 to-charcoal-800',
  'from-charcoal-800 to-charcoal-900',
  'from-charcoal-700 to-charcoal-800',
  'from-charcoal-800 to-charcoal-900',
];

const ACCENT_COLORS = [
  'rgba(212,175,55,0.08)',
  'rgba(212,175,55,0.05)',
  'rgba(212,175,55,0.10)',
  'rgba(212,175,55,0.06)',
  'rgba(212,175,55,0.07)',
];

function CollectionItem({
  item,
  index,
}: {
  item: (typeof collections)[number];
  index: number;
}) {
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
      className={`${index % 2 === 1 ? 'md:mt-28' : ''}`}
    >
      <Link href="/catalogo" className="group block">
        {/* Image card */}
        <div
          className="relative aspect-[3/4] overflow-hidden mb-5 rounded-2xl group-hover:shadow-2xl group-hover:shadow-gold-500/20 transition-all duration-500"
          style={{
            background: `linear-gradient(145deg, #1A1A1A, #0D0D0D)`,
            boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 -1px 0 rgba(0,0,0,0.4) inset',
          }}
        >
          {/* Image */}
          <img
            src={item.image}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700"
          />

          {/* Inner gradient accent */}
          <div
            className="absolute inset-0 transition-opacity duration-700 group-hover:opacity-150"
            style={{
              background: `radial-gradient(ellipse 80% 80% at 50% 100%, ${ACCENT_COLORS[index]}, transparent)`,
            }}
          />

          {/* Decorative oversized number */}
          <span className="absolute -bottom-6 -right-2 font-display text-[10rem] leading-none select-none pointer-events-none"
            style={{ color: 'rgba(242,240,237,0.025)' }}>
            {item.num}
          </span>

          {/* Top border accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] group-hover:h-[3px] transition-all duration-500"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)' }} />

          {/* Hover reveal CTA */}
          <div className="absolute inset-0 flex items-end p-6">
            <div className="opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
              <span
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-gold-400 px-4 py-2 rounded-full font-sans-custom shadow-lg"
                style={{
                  background: 'rgba(26,26,26,0.95)',
                  border: '1px solid rgba(212,175,55,0.5)',
                  boxShadow: '0 4px 20px rgba(212,175,55,0.3)',
                }}
              >
                Ver colección <ArrowUpRight size={10} />
              </span>
            </div>
          </div>

          {/* Gold corner accent */}
          <div className="absolute top-4 right-4 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="w-full h-px bg-gold-500/40" />
            <div className="w-px h-full bg-gold-500/40 ml-auto" />
          </div>
        </div>

        {/* Text */}
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-display-sm text-cream-100 group-hover:text-gold-400 transition-colors duration-500">
            {item.title}
          </h3>
          <span className="text-label uppercase text-cream-200/20 font-mono">
            {item.num}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-cream-200/30 font-sans tracking-wide">
          {item.tagline}
        </p>
      </Link>
    </motion.div>
  );
}

export function FeaturedCollection() {
  return (
    <section className="py-24 md:py-34 section-padding">
      <div className="max-w-[90rem] mx-auto">
        {/* Section header — asymmetric */}
        <div className="flex flex-col md:flex-row md:items-end gap-6 mb-16 md:mb-24">
          <div className="flex-1">
            <span className="text-label uppercase text-cream-200/25 font-sans block mb-4">
              Colección
            </span>
            <h2 className="font-display text-display-xl text-cream-100">
              Piezas que
              <br />
              <span className="italic text-outline-gold">trascienden</span>
            </h2>
          </div>
          <Link
            href="/catalogo"
            className="btn-pill-outline group self-start md:self-auto"
          >
            Ver todo
            <ArrowUpRight
              size={14}
              className="group-hover:rotate-45 transition-transform duration-500"
            />
          </Link>
        </div>

        {/* Asymmetric grid with parallax */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {collections.map((item, i) => (
            <CollectionItem key={item.title} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
