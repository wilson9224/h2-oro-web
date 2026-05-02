'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp } from 'lucide-react';

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
        transition={{ duration: 1.1, delay, ease }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export function Hero() {
  const goldPrice = useGoldPrice();

  return (
    <section className="relative min-h-[100svh] flex items-end pb-16 md:pb-24 overflow-hidden">
      {/* Deep atmospheric layers */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 70% 40%, rgba(212,175,55,0.055) 0%, transparent 60%), radial-gradient(ellipse 50% 70% at 10% 80%, rgba(212,175,55,0.04) 0%, transparent 55%)',
        }}
      />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '256px',
        }}
      />

      {/* Vertical line — editorial detail */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 1.4, delay: 0.1, ease }}
        className="absolute left-[calc(50%-1px)] top-0 h-[35vh] w-px origin-top"
        style={{ background: 'linear-gradient(to bottom, rgba(212,175,55,0.25), transparent)' }}
      />

      {/* Content */}
      <div className="relative z-10 section-padding w-full max-w-[90rem] mx-auto">

        {/* Gold price ticker — top right floating */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="absolute top-[8vh] right-5 sm:right-8 md:right-12 lg:right-20"
        >
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full"
            style={{
              background: 'rgba(212,175,55,0.06)',
              border: '1px solid rgba(212,175,55,0.2)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold-400" />
            </span>
            <TrendingUp size={11} className="text-gold-400/70" />
            <span className="font-mono text-gold-400 font-semibold tracking-tight text-sm md:text-base">
              {goldPrice ?? '—'}
            </span>
            <span className="text-cream-200/30 text-[10px] font-sans hidden sm:inline">/g · Oro 24K</span>
          </div>
        </motion.div>

        {/* Label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex items-center gap-3 mb-10 md:mb-16"
        >
          <div className="w-8 h-px bg-gold-500/50" />
          <span className="text-label uppercase text-cream-200/35 font-sans tracking-[0.2em]">
            Joyería artesanal · Colombia
          </span>
        </motion.div>

        {/* Main heading — cinematic scale */}
        <h1 className="font-display mb-10 md:mb-16">
          <RevealLine delay={0.25}>
            <span className="text-hero text-cream-100 font-light leading-[0.95]">
              El arte de
            </span>
          </RevealLine>
          <RevealLine delay={0.38}>
            <span
              className="text-hero leading-[0.95] font-semibold"
              style={{
                WebkitTextFillColor: 'transparent',
                WebkitTextStroke: '1.5px rgba(212,175,55,0.5)',
              }}
            >
              crear
            </span>
            <span className="text-hero text-gold-400 font-semibold leading-[0.95] ml-4 md:ml-6">
              joyas
            </span>
          </RevealLine>
          <RevealLine delay={0.5}>
            <span className="text-hero text-cream-100 font-extralight leading-[0.95]">
              únicas
            </span>
          </RevealLine>
        </h1>

        {/* Bottom — description + CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.85, ease }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-8"
        >
          <p className="max-w-[26rem] text-sm md:text-base leading-[1.8] text-cream-200/45 font-sans">
            Cada pieza nace de la tradición orfebre colombiana
            y la visión contemporánea. Oro de alta pureza,
            diseño personalizado, artesanía excepcional.
          </p>

          <div className="flex items-center gap-4">
            <Link href="/catalogo" className="btn-pill group">
              Explorar colección
              <ArrowRight
                size={13}
                className="group-hover:translate-x-1 transition-transform duration-500"
              />
            </Link>
            <Link href="/proceso" className="btn-pill-outline">
              Ver proceso
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Bottom horizontal line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, delay: 1.1, ease }}
        className="absolute bottom-0 left-0 right-0 h-px origin-left"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15) 40%, rgba(212,175,55,0.15) 60%, transparent)' }}
      />
    </section>
  );
}
