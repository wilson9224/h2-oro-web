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

const ACCENT_COLORS = [
  'rgba(212,175,55,0.09)',
  'rgba(212,175,55,0.06)',
  'rgba(212,175,55,0.11)',
  'rgba(212,175,55,0.07)',
  'rgba(212,175,55,0.08)',
];

function CollectionCard({
  item,
  index,
}: {
  item: (typeof collections)[number];
  index: number;
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <motion.div ref={ref} style={{ y }}>
      <Link href="/catalogo" className="group block">
        <div
          className="relative aspect-[3/4] overflow-hidden mb-4"
          style={{
            background: 'linear-gradient(160deg, #161410, #0D0B08)',
            borderTop: '1px solid rgba(212,175,55,0.1)',
          }}
        >
          <img
            src={item.image}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-700 scale-100 group-hover:scale-[1.03] transition-transform"
          />

          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 90% 60% at 50% 100%, ${ACCENT_COLORS[index]}, transparent)`,
            }}
          />

          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: 'rgba(0,0,0,0.25)' }}
          />

          {/* Top rule — thread visual */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-px origin-left"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: index * 0.08 }}
            style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.5), rgba(212,175,55,0.15) 70%, transparent)' }}
          />

          {/* Hover CTA */}
          <div className="absolute inset-0 flex items-end p-5">
            <div className="opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-400">
              <span
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-gold-400 px-4 py-2 font-sans"
                style={{
                  background: 'rgba(10,10,10,0.92)',
                  border: '1px solid rgba(212,175,55,0.35)',
                  borderRadius: '2px',
                }}
              >
                Ver <ArrowUpRight size={10} />
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-display-sm text-cream-100/90 group-hover:text-gold-400 transition-colors duration-400">
            {item.title}
          </h3>
          <span className="text-label font-mono text-cream-200/18">
            {item.num}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-cream-200/35 font-sans tracking-wide leading-relaxed">
          {item.tagline}
        </p>
      </Link>
    </motion.div>
  );
}

export function FeaturedCollection() {
  return (
    <section id="coleccion" className="py-24 md:py-32 px-5 sm:px-8 md:px-12 lg:px-16">
      <div className="max-w-[1200px] mx-auto">

        {/* Collection grid — 2 filas x 3 columnas en sm+, header integrado en primer slot */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-5">
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
                    Colección
                  </span>
                </div>
                <h2
                  className="font-display text-cream-100 leading-[1.05]"
                  style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)' }}
                >
                  Nuestros <br />
                  <span className="text-gold-400 font-semibold">diseños</span>
                </h2>
                <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-cream-200/40 font-sans leading-relaxed">
                  Explorá nuestros diseños. Si algo te inspira o tienes una idea propia, escribenos y lo hacemos realidad.
                </p>
              </div>
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-1 self-start text-[9px] sm:text-[10px] uppercase tracking-[0.16em] text-gold-400 font-sans px-3 py-1.5"
                style={{ border: '1px solid rgba(212,175,55,0.4)', borderRadius: '100px' }}
              >
                Ver todo <ArrowUpRight size={9} />
              </Link>
            </div>
          </motion.div>

          {collections.map((item, i) => (
            <CollectionCard key={item.title} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
