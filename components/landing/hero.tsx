'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function useGoldPrice() {
  const [priceCop, setPriceCop] = useState<string | null>(null);
  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/gold-price/current`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setPriceCop(formatCOP(data.priceGram24k));
    } catch {
      setPriceCop(formatCOP(317235));
    }
  }, []);
  useEffect(() => {
    fetchPrice();
    const iv = setInterval(fetchPrice, 15 * 60 * 1000);
    return () => clearInterval(iv);
  }, [fetchPrice]);
  return priceCop;
}

const ease = [0.16, 1, 0.3, 1] as const;

function RevealLine({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        className="block"
        initial={{ y: '110%' }}
        animate={{ y: 0 }}
        transition={{ duration: 1, delay, ease }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export function Hero() {
  const goldPrice = useGoldPrice();

  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-[15%] right-[10%] w-[35vw] h-[35vw] rounded-full bg-gold-500/[0.03] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-5%] w-[25vw] h-[25vw] rounded-full bg-gold-600/[0.04] blur-[100px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 section-padding w-full max-w-[90rem] mx-auto">
        {/* Top bar — label + gold price */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex items-center justify-between mb-8 md:mb-12"
        >
          <span className="text-label uppercase text-cream-200/30 font-sans">
            Joyería artesanal — Colombia
          </span>

          {/* Live gold price pill */}
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-500/60 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-500" />
            </span>
            <span className="text-label uppercase text-cream-200/40 font-sans hidden sm:inline">
              Oro 24K
            </span>
            <span className="font-mono text-sm md:text-base text-gold-400 tracking-tight">
              {goldPrice ?? '—'}
            </span>
            <span className="text-label uppercase text-cream-200/25 font-sans hidden md:inline">
              / gramo
            </span>
          </div>
        </motion.div>

        {/* Main heading — oversized, mixed weights */}
        <h1 className="font-serif">
          <RevealLine delay={0.3}>
            <span className="text-hero text-cream-100 font-normal">
              El arte de
            </span>
          </RevealLine>
          <RevealLine delay={0.45}>
            <span className="text-hero italic text-outline-gold">
              crear
            </span>
          </RevealLine>
          <RevealLine delay={0.5}>
            <span className="text-hero text-gold-400 font-semibold">
              joyas
            </span>
          </RevealLine>
          <RevealLine delay={0.6}>
            <span className="text-hero text-cream-100 font-light">
              únicas
            </span>
            <span className="text-hero text-outline ml-4 hidden lg:inline">
              ✦
            </span>
          </RevealLine>
        </h1>

        {/* Bottom bar — description + CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9, ease }}
          className="mt-8 md:mt-12 flex flex-col md:flex-row md:items-end md:justify-between gap-8"
        >
          <p className="max-w-sm text-sm md:text-base leading-relaxed text-cream-200/50 font-sans">
            Cada pieza nace de la tradición orfebre colombiana
            y la visión contemporánea. Oro de alta pureza,
            diseño personalizado, artesanía excepcional.
          </p>

          <div className="flex items-center gap-3">
            <Link href="/catalogo" className="btn-pill group">
              Explorar
              <ArrowRight
                size={14}
                className="group-hover:translate-x-1 transition-transform duration-500"
              />
            </Link>
            <Link href="/proceso" className="btn-pill-outline">
              Proceso
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Bottom line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.2, delay: 1.2, ease }}
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cream-200/10 to-transparent origin-left"
      />
    </section>
  );
}
