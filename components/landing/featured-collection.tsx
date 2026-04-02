'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const collections = [
  { title: 'Anillos', tagline: 'Tu historia, forjada en oro', num: '01' },
  { title: 'Collares', tagline: 'Elegancia que enmarca', num: '02' },
  { title: 'Pulseras', tagline: 'El complemento que faltaba', num: '03' },
  { title: 'Aretes', tagline: 'Brillo que cautiva', num: '04' },
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
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      className={`${index % 2 === 1 ? 'md:mt-32' : ''}`}
    >
      <Link href="/catalogo" className="group block">
        {/* Image placeholder — aspect ratio container */}
        <div className="relative aspect-[3/4] overflow-hidden bg-charcoal-800 mb-5">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-charcoal-900/40" />
          {/* Decorative oversized number */}
          <span className="absolute -bottom-4 -right-2 font-serif text-[12rem] leading-none text-cream-200/[0.03] select-none">
            {item.num}
          </span>
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gold-500/0 group-hover:bg-gold-500/[0.06] transition-colors duration-700" />
          <div className="absolute bottom-6 left-6 opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-500">
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-gold-400">
              Ver colección <ArrowUpRight size={12} />
            </span>
          </div>
        </div>

        {/* Text */}
        <div className="flex items-baseline justify-between">
          <h3 className="font-serif text-display-sm text-cream-100 group-hover:text-gold-400 transition-colors duration-500">
            {item.title}
          </h3>
          <span className="text-label uppercase text-cream-200/20 font-mono">
            {item.num}
          </span>
        </div>
        <p className="mt-2 text-sm text-cream-200/35 font-sans">
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
            <h2 className="font-serif text-display-xl text-cream-100">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {collections.map((item, i) => (
            <CollectionItem key={item.title} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
