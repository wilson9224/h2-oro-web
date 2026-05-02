'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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

  useEffect(() => {
    const supabase = createClient();

    const resolvePrice = (row: {
      purchase_base_price: number | null;
      international_price_per_gram: number | null;
      purchase_percentage: number | null;
    }): number | null => {
      if (row.purchase_base_price) return row.purchase_base_price;
      if (row.international_price_per_gram && row.purchase_percentage) {
        return row.international_price_per_gram * row.purchase_percentage / 100;
      }
      return null;
    };

    const fetchPrice = async () => {
      const { data, error } = await supabase
        .from('pricing_metals')
        .select('purchase_base_price, international_price_per_gram, purchase_percentage')
        .eq('metal_code', 'gold')
        .single();

      if (!error && data) {
        const price = resolvePrice(data);
        if (price) setPriceCop(formatCOP(price));
      }
    };

    fetchPrice();

    const channel = supabase
      .channel('hero-gold-price')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pricing_metals', filter: 'metal_code=eq.gold' },
        (payload) => {
          const row = payload.new as {
            purchase_base_price: number | null;
            international_price_per_gram: number | null;
            purchase_percentage: number | null;
          };
          const price = resolvePrice(row);
          if (price) setPriceCop(formatCOP(price));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

function FloatingBubble({
  className,
  style,
  children,
  floatY,
  floatDuration,
  entryDelay,
  entryDuration = 0.65,
}: {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  floatY: [number, number];
  floatDuration: number;
  entryDelay: number;
  entryDuration?: number;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, scale: 0.4, y: floatY[0] }}
      animate={{
        opacity: 1,
        scale: 1,
        y: floatY,
      }}
      transition={{
        opacity: { duration: entryDuration, delay: entryDelay },
        scale: { duration: entryDuration, delay: entryDelay, ease: [0.34, 1.56, 0.64, 1] },
        y: {
          duration: floatDuration,
          repeat: Infinity,
          repeatType: 'mirror',
          ease: [0.45, 0, 0.55, 1],
          delay: entryDelay + entryDuration * 0.5,
        },
      }}
    >
      {children}
    </motion.div>
  );
}

function GoldBubblesMobile({ price }: { price: string | null }) {
  return (
    <div className="flex md:hidden justify-center items-center gap-3 mt-8 w-full">
      {/* Satellite bubbles stacked — left */}
      <div className="flex flex-col gap-2">
        <FloatingBubble
          floatY={[4, -4]}
          floatDuration={3.6}
          entryDelay={1.1}
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 35% 35%, rgba(38,33,20,0.95), rgba(22,19,10,0.95))',
            border: '1px solid rgba(212,175,55,0.3)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span className="text-[8px] font-sans text-cream-200/50 uppercase tracking-[0.1em] leading-tight text-center px-2">
            Precio de compra
          </span>
        </FloatingBubble>
        <FloatingBubble
          floatY={[-4, 4]}
          floatDuration={5.0}
          entryDelay={1.3}
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 35% 35%, rgba(38,33,20,0.95), rgba(22,19,10,0.95))',
            border: '1px solid rgba(212,175,55,0.3)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span className="text-[8px] font-sans text-gold-400/70 font-semibold uppercase tracking-[0.1em] leading-tight text-center px-2">
            Oro puro 24K
          </span>
        </FloatingBubble>
      </div>

      {/* Dot */}
      <FloatingBubble
        floatY={[-3, 3]}
        floatDuration={2.4}
        entryDelay={1.4}
        entryDuration={0.4}
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: 'rgba(212,175,55,0.8)', boxShadow: '0 0 6px rgba(212,175,55,0.5)' }}
      />

      {/* Main bubble — center */}
      <FloatingBubble
        floatY={[-5, 5]}
        floatDuration={4.2}
        entryDelay={0.8}
        entryDuration={0.6}
        className="w-[96px] h-[96px] rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: 'radial-gradient(circle at 35% 35%, rgba(45,40,28,0.98), rgba(28,24,14,0.98))',
          border: '1.5px solid rgba(212,175,55,0.55)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,175,55,0.15)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <span className="font-mono text-gold-400 font-bold text-sm leading-tight tracking-tight text-center px-2">
          {price ?? '—'}
        </span>
      </FloatingBubble>

      {/* Dot */}
      <FloatingBubble
        floatY={[3, -3]}
        floatDuration={2.8}
        entryDelay={1.5}
        entryDuration={0.4}
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: 'rgba(212,175,55,0.7)', boxShadow: '0 0 5px rgba(212,175,55,0.4)' }}
      />

      {/* Por gramo — right */}
      <FloatingBubble
        floatY={[4, -5]}
        floatDuration={3.9}
        entryDelay={1.6}
        entryDuration={0.6}
        className="w-[60px] h-[60px] rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: 'radial-gradient(circle at 35% 35%, rgba(32,28,16,0.92), rgba(18,15,8,0.92))',
          border: '1px solid rgba(212,175,55,0.2)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <span className="text-[8px] font-sans text-cream-200/40 uppercase tracking-[0.1em] leading-tight text-center px-1">
          Por gramo
        </span>
      </FloatingBubble>
    </div>
  );
}

function GoldBubbles({ price }: { price: string | null }) {
  return (
    <div className="relative w-[260px] h-[260px] hidden md:block">
      {/* Dot accent — top right */}
      <FloatingBubble
        floatY={[-4, 4]}
        floatDuration={2.1}
        entryDelay={1.8}
        entryDuration={0.5}
        className="absolute top-[18px] right-[48px] w-3 h-3 rounded-full"
        style={{ background: 'rgba(212,175,55,0.9)', boxShadow: '0 0 8px rgba(212,175,55,0.6)' }}
      />
      {/* Dot accent — between bubbles */}
      <FloatingBubble
        floatY={[3, -5]}
        floatDuration={2.7}
        entryDelay={2.0}
        entryDuration={0.5}
        className="absolute bottom-[68px] left-[84px] w-2 h-2 rounded-full"
        style={{ background: 'rgba(212,175,55,0.7)', boxShadow: '0 0 6px rgba(212,175,55,0.4)' }}
      />
      {/* Dot accent — lower right */}
      <FloatingBubble
        floatY={[-3, 5]}
        floatDuration={3.2}
        entryDelay={2.2}
        entryDuration={0.5}
        className="absolute bottom-[32px] right-[36px] w-2.5 h-2.5 rounded-full"
        style={{ background: 'rgba(212,175,55,0.55)' }}
      />

      {/* Main bubble — price */}
      <FloatingBubble
        floatY={[-8, 8]}
        floatDuration={4.2}
        entryDelay={0.8}
        entryDuration={0.7}
        className="absolute top-[20px] left-[40px] w-[130px] h-[130px] rounded-full flex flex-col items-center justify-center"
        style={{
          background: 'radial-gradient(circle at 35% 35%, rgba(45,40,28,0.98), rgba(28,24,14,0.98))',
          border: '1.5px solid rgba(212,175,55,0.55)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,175,55,0.15)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <span className="font-mono text-gold-400 font-bold text-lg leading-tight tracking-tight text-center px-2">
          {price ?? '—'}
        </span>
      </FloatingBubble>

      {/* Satellite bubble 1 — "Precio de compra" */}
      <FloatingBubble
        floatY={[6, -6]}
        floatDuration={3.6}
        entryDelay={1.1}
        className="absolute bottom-[50px] right-[10px] w-[100px] h-[100px] rounded-full flex flex-col items-center justify-center"
        style={{
          background: 'radial-gradient(circle at 35% 35%, rgba(38,33,20,0.95), rgba(22,19,10,0.95))',
          border: '1px solid rgba(212,175,55,0.3)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,175,55,0.08)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <span className="text-[10px] font-sans text-cream-200/50 uppercase tracking-[0.12em] leading-tight text-center px-3">
          Precio de compra
        </span>
      </FloatingBubble>

      {/* Satellite bubble 2 — "Oro puro 24K" */}
      <FloatingBubble
        floatY={[-5, 7]}
        floatDuration={5.0}
        entryDelay={1.35}
        className="absolute bottom-[10px] left-[20px] w-[100px] h-[100px] rounded-full flex flex-col items-center justify-center"
        style={{
          background: 'radial-gradient(circle at 35% 35%, rgba(38,33,20,0.95), rgba(22,19,10,0.95))',
          border: '1px solid rgba(212,175,55,0.3)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,175,55,0.08)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <span className="text-[10px] font-sans text-gold-400/70 font-semibold uppercase tracking-[0.12em] leading-tight text-center px-3">
          Oro puro 24K
        </span>
      </FloatingBubble>

      {/* Satellite bubble 3 — "Por gramo" */}
      <FloatingBubble
        floatY={[4, -7]}
        floatDuration={3.9}
        entryDelay={1.6}
        entryDuration={0.6}
        className="absolute top-[10px] right-[8px] w-[72px] h-[72px] rounded-full flex items-center justify-center"
        style={{
          background: 'radial-gradient(circle at 35% 35%, rgba(32,28,16,0.92), rgba(18,15,8,0.92))',
          border: '1px solid rgba(212,175,55,0.2)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <span className="text-[9px] font-sans text-cream-200/40 uppercase tracking-[0.1em] leading-tight text-center px-2">
          Por gramo
        </span>
      </FloatingBubble>
    </div>
  );
}

export function Hero() {
  const goldPrice = useGoldPrice();

  return (
    <section className="relative min-h-[100svh] flex items-center md:items-end pt-24 pb-12 md:pt-0 md:pb-24 overflow-hidden">
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

        {/* Gold price bubbles — desktop: absolute center-right; mobile: inline after heading */}
        <div className="hidden md:block absolute top-1/2 -translate-y-1/2 right-[8%] lg:right-[15%] pointer-events-none">
          <GoldBubbles price={goldPrice} />
        </div>

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
          <div>
            <p className="max-w-[26rem] text-sm md:text-base leading-[1.8] text-cream-200/45 font-sans">
              Cada pieza nace de la tradición orfebre colombiana
              y la visión contemporánea. Oro de alta pureza,
              diseño personalizado, artesanía excepcional.
            </p>
            <GoldBubblesMobile price={goldPrice} />
          </div>

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
