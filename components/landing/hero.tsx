'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown, X, Calculator } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function useGoldPrice(): { raw: number | null; formatted: string | null } {
  const [raw, setRaw] = useState<number | null>(null);

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
        if (price) setRaw(price);
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
          if (price) setRaw(price);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { raw, formatted: raw ? formatCOP(raw) : null };
}

const ease = [0.16, 1, 0.3, 1] as const;

// ─── Wave canvas — superficie de agua/oro ─────────────────────────────────
export function WaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  const draw = useCallback((ts: number) => {
    if (!startRef.current) startRef.current = ts;
    const t = (ts - startRef.current) * 0.001;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Capas de ondas — múltiples frecuencias como el agua real
    const layers = [
      { amp: 18, freq: 0.012, speed: 0.4,  alpha: 0.055, width: 1.2 },
      { amp: 10, freq: 0.019, speed: 0.65, alpha: 0.04,  width: 0.8 },
      { amp: 24, freq: 0.008, speed: 0.25, alpha: 0.035, width: 1.5 },
      { amp: 6,  freq: 0.03,  speed: 1.1,  alpha: 0.025, width: 0.6 },
      { amp: 14, freq: 0.015, speed: 0.5,  alpha: 0.045, width: 1.0 },
    ];

    const numLines = 38;
    for (let l = 0; l < layers.length; l++) {
      const { amp, freq, speed, alpha, width } = layers[l];
      for (let i = 0; i < numLines; i++) {
        const y0 = (i / numLines) * H;
        const phase = t * speed + l * 1.3 + i * 0.18;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 3) {
          const y = y0 + Math.sin(x * freq + phase) * amp
                      + Math.sin(x * freq * 1.7 + phase * 0.6) * (amp * 0.3);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        // Degradado vertical: más brillante en el centro
        const centerDist = Math.abs(i / numLines - 0.5) * 2; // 0 en centro, 1 en bordes
        const a = alpha * (1 - centerDist * 0.6);
        ctx.strokeStyle = `rgba(212,175,55,${a})`;
        ctx.lineWidth = width;
        ctx.stroke();
      }
    }

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={1400}
      height={900}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.9, mixBlendMode: 'screen' }}
    />
  );
}

// ─── Burbujas del splash — misma genética, flotan en loop ─────────────────
const HERO_BUBBLES = [
  { id: 0,  left: '7%',  size: 28, opacity: 0.18, duration: 9.2,  delay: 0 },
  { id: 1,  left: '14%', size: 12, opacity: 0.14, duration: 7.8,  delay: 1.4 },
  { id: 2,  left: '22%', size: 44, opacity: 0.12, duration: 11.5, delay: 0.6 },
  { id: 3,  left: '31%', size: 18, opacity: 0.20, duration: 8.4,  delay: 2.1 },
  { id: 4,  left: '40%', size: 8,  opacity: 0.16, duration: 7.1,  delay: 0.3 },
  { id: 5,  left: '49%', size: 36, opacity: 0.10, duration: 12.0, delay: 3.2 },
  { id: 6,  left: '57%', size: 16, opacity: 0.18, duration: 8.9,  delay: 1.0 },
  { id: 7,  left: '65%', size: 52, opacity: 0.09, duration: 13.4, delay: 0.8 },
  { id: 8,  left: '73%', size: 22, opacity: 0.15, duration: 9.7,  delay: 2.6 },
  { id: 9,  left: '80%', size: 10, opacity: 0.22, duration: 6.8,  delay: 1.8 },
  { id: 10, left: '87%', size: 34, opacity: 0.11, duration: 11.1, delay: 0.4 },
  { id: 11, left: '93%', size: 14, opacity: 0.17, duration: 8.2,  delay: 3.8 },
  { id: 12, left: '3%',  size: 20, opacity: 0.13, duration: 10.3, delay: 2.9 },
  { id: 13, left: '60%', size: 9,  opacity: 0.21, duration: 7.4,  delay: 4.5 },
  { id: 14, left: '26%', size: 62, opacity: 0.07, duration: 15.0, delay: 1.2 },
  { id: 15, left: '44%', size: 16, opacity: 0.16, duration: 8.6,  delay: 5.0 },
  { id: 16, left: '70%', size: 26, opacity: 0.13, duration: 10.8, delay: 3.4 },
  { id: 17, left: '52%', size: 11, opacity: 0.19, duration: 7.6,  delay: 0.9 },
] as const;

function HeroBubbles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
      {HERO_BUBBLES.map((b) => (
        <motion.div
          key={b.id}
          className="absolute rounded-full"
          style={{
            left: b.left,
            bottom: '-8%',
            width: b.size,
            height: b.size,
            background: `radial-gradient(circle at 35% 35%, rgba(212,175,55,${b.opacity * 2}), rgba(212,175,55,${b.opacity * 0.25}))`,
            border: `1px solid rgba(212,175,55,${b.opacity * 0.9})`,
          }}
          animate={{
            y: [0, -1100],
            opacity: [0, b.opacity * 3.5, b.opacity * 3.5, 0],
            scale: [0.5, 1, 0.9, 0.7],
          }}
          transition={{
            duration: b.duration,
            delay: b.delay,
            repeat: Infinity,
            repeatDelay: b.delay * 0.6 + 1.5,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

// ─── Pureza del oro: factor por ley ────────────────────────────────────────
const PURITY: Record<string, number> = {
  '8K':  8  / 24,
  '10K': 10 / 24,
  '14K': 14 / 24,
  '18K': 18 / 24,
  '24K': 24 / 24,
};

// ─── Calculadora de compra de oro ──────────────────────────────────────────
function GoldCalculator({ pricePerGram24k, stretch = false, inSheet = false }: { pricePerGram24k: number | null; stretch?: boolean; inSheet?: boolean }) {
  const [karat, setKarat] = useState('18K');
  const [grams, setGrams] = useState('');

  const result = useMemo(() => {
    if (!pricePerGram24k || !grams || isNaN(parseFloat(grams))) return null;
    const g = parseFloat(grams);
    if (g <= 0) return null;
    return pricePerGram24k * PURITY[karat] * g;
  }, [pricePerGram24k, karat, grams]);

  const formattedResult = result
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(result)
    : null;

  const body = (
    <div className={`px-6 py-5 flex flex-col gap-6 ${stretch ? 'flex-1 justify-between' : ''}`}>
      {/* Label sección */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-px" style={{ background: 'rgba(212,175,55,0.3)' }} />
        <span className="text-[11px] font-sans uppercase tracking-[0.2em] text-cream-200/35">
          Calcula el valor de tu oro
        </span>
      </div>

      {/* Selector de ley */}
      <div className="flex flex-col gap-2.5">
        <label className="text-[11px] font-mono uppercase tracking-[0.18em] text-cream-200/40">
          Ley del oro
        </label>
        <div className="flex gap-2">
          {Object.keys(PURITY).map((k) => (
            <button
              key={k}
              onClick={() => setKarat(k)}
              className="flex-1 py-3 text-[12px] font-mono uppercase tracking-[0.1em] transition-all duration-200"
              style={{
                borderRadius: '2px',
                border: karat === k
                  ? '1px solid rgba(212,175,55,0.6)'
                  : '1px solid rgba(255,255,255,0.07)',
                background: karat === k
                  ? 'rgba(212,175,55,0.12)'
                  : 'rgba(255,255,255,0.02)',
                color: karat === k
                  ? 'rgba(212,175,55,0.95)'
                  : 'rgba(242,240,237,0.35)',
              }}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Input de gramos */}
      <div className="flex flex-col gap-2.5">
        <label className="text-[11px] font-mono uppercase tracking-[0.18em] text-cream-200/40">
          Peso en gramos
        </label>
        <div
          className="flex items-center"
          style={{
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '2px',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <input
            type="number"
            min="0"
            step="0.1"
            placeholder="0.0"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            className="flex-1 bg-transparent px-5 py-4 text-cream-100 text-base font-mono outline-none placeholder:text-cream-200/20"
          />
          <span
            className="px-4 py-4 text-[12px] font-mono text-cream-200/30 uppercase"
            style={{ borderLeft: '1px solid rgba(255,255,255,0.07)' }}
          >
            g
          </span>
        </div>
      </div>

      {/* Resultado */}
      <div
        className="flex flex-col gap-1.5 py-5 px-5 transition-all duration-300"
        style={{
          background: formattedResult ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.02)',
          border: `1px solid ${formattedResult ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)'}`,
          borderRadius: '2px',
          minHeight: '80px',
          justifyContent: 'center',
        }}
      >
        {formattedResult ? (
          <>
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-cream-200/35">
              Recibirías aproximadamente
            </span>
            <motion.span
              key={formattedResult}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="font-mono text-gold-400 font-bold leading-none"
              style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)' }}
            >
              {formattedResult}
            </motion.span>
            <span className="text-[9px] font-sans text-cream-200/25 mt-0.5">
              por {parseFloat(grams || '0').toFixed(1)}g de oro {karat} · precio de referencia hoy
            </span>
          </>
        ) : (
          <span className="text-[12px] font-sans text-cream-200/20 text-center">
            Ingresa el peso para ver el valor estimado
          </span>
        )}
      </div>

      {/* Nota legal */}
      <p className="text-[10px] font-sans text-cream-200/20 leading-relaxed">
        * Valor de referencia basado en el precio de compra actual. El monto final depende de la evaluación presencial.
      </p>
    </div>
  );

  if (inSheet) return body;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.5, ease }}
      className={`flex flex-col ${stretch ? 'w-full h-full justify-between' : 'w-full max-w-[400px]'}`}
      style={{
        background: 'rgba(10,9,5,0.75)',
        border: '1px solid rgba(212,175,55,0.18)',
        borderRadius: '4px',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {/* Header — precio live */}
      <div
        className="flex items-center justify-between px-6 py-5"
        style={{ borderBottom: '1px solid rgba(212,175,55,0.1)' }}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-sans uppercase tracking-[0.1em] text-cream-200/28 leading-none">
            Oro 24K · por gramo
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <motion.span
            key={pricePerGram24k ?? 'loading'}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="font-mono text-gold-400 font-bold text-xl leading-none"
          >
            {pricePerGram24k
              ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(pricePerGram24k)
              : '—'}
          </motion.span>
          <span
            className="text-[8px] font-mono uppercase tracking-[0.1em] px-2 py-1"
            style={{
              color: 'rgba(100,210,120,0.9)',
              background: 'rgba(100,210,120,0.07)',
              border: '1px solid rgba(100,210,120,0.15)',
              borderRadius: '2px',
            }}
          >
            ● live
          </span>
        </div>
      </div>
      {body}
    </motion.div>
  );
}

// ─── Bottom Sheet mobile para la calculadora ──────────────────────────────
function GoldCalculatorBottomSheet({
  open,
  onClose,
  pricePerGram24k,
}: {
  open: boolean;
  onClose: () => void;
  pricePerGram24k: number | null;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden rounded-t-2xl overflow-hidden"
            style={{
              background: 'rgba(10,9,5,0.97)',
              border: '1px solid rgba(212,175,55,0.2)',
              borderBottom: 'none',
              maxHeight: '90svh',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(212,175,55,0.25)' }} />
            </div>
            {/* Header sheet */}
            <div className="flex items-center justify-between px-6 py-3" style={{ borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
              <span className="text-[11px] font-sans uppercase tracking-[0.2em] text-cream-200/40">
                Calculadora de oro
              </span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <X size={14} className="text-cream-200/50" />
              </button>
            </div>
            {/* Contenido calculadora */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90svh - 80px)' }}>
              <GoldCalculator pricePerGram24k={pricePerGram24k} inSheet />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function Hero() {
  const { raw: goldPriceRaw } = useGoldPrice();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <section className="relative min-h-[100dvh] overflow-hidden" style={{ background: '#080808' }}>

      {/* ── Fondo ─────────────────────────────────────────────── */}
      <WaveCanvas />
      <HeroBubbles />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(212,175,55,0.06) 0%, transparent 65%)' }}
      />

      {/* ── Contenido centrado verticalmente ──────────────────── */}
      <div className="relative z-10 min-h-[100dvh] flex flex-col justify-center
                      px-5 sm:px-8 md:px-12 lg:px-16
                      py-16 md:py-24 max-w-[1200px] mx-auto w-full gap-6">

        {/* Label */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease }}
          className="flex items-center gap-3"
        >
          <div className="w-6 h-px" style={{ background: 'rgba(212,175,55,0.5)' }} />
          <span className="text-[10px] font-sans uppercase tracking-[0.24em] text-cream-200/35">
            Taller de joyería · Bogotá
          </span>
        </motion.div>

        {/* ── Dos columnas: copy izquierda | calculadora derecha ── */}
        <div className="flex flex-col md:flex-row md:items-stretch gap-10 md:gap-30">

          {/* ═══ Copy ═══════════════════════════════════════════ */}
          <div className="flex flex-col items-center md:items-start flex-1 min-w-0 text-center md:text-left">

            <div className="overflow-hidden mb-1">
              <motion.h1
                className="font-display leading-[1.05] tracking-tight text-cream-100"
                style={{ fontSize: 'clamp(3rem, 5vw, 5.5rem)' }}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.3, ease }}
              >
                Tu idea,
              </motion.h1>
            </div>
            <div className="overflow-hidden mb-1">
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.44, ease }}
              >
                <span className="font-display leading-[1.05] tracking-tight text-gold-400 font-semibold"
                  style={{ fontSize: 'clamp(3rem, 5vw, 5.5rem)' }}>
                  hecha joya
                </span>
              </motion.div>
            </div>
            <div className="overflow-hidden mb-8">
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.56, ease }}
              >
                <span className="font-display leading-[1.05] tracking-tight text-cream-100 font-extralight"
                  style={{ fontSize: 'clamp(3rem, 5vw, 5.5rem)' }}>
                  en oro.
                </span>
              </motion.div>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7, ease }}
              className="text-sm md:text-base leading-relaxed text-cream-200/50 font-sans max-w-[28rem] mb-6"
            >
              Diseñamos y fabricamos piezas únicas en oro y plata desde nuestro taller en Bogotá.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.8, ease }}
              className="flex items-center gap-2 mb-8"
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid rgba(212,175,55,0.15)',
                borderRadius: '2px',
                background: 'rgba(212,175,55,0.04)',
              }}
            >
              <span className="text-gold-400 text-xs">✦</span>
              <span className="text-[11px] font-sans uppercase tracking-[0.12em] text-cream-200/35">
                Más de 20 años de experiencia en joyería artesanal
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.95, ease }}
            >
              <button
                onClick={() => {
                  const el = document.getElementById('coleccion');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="btn-pill group"
              >
                Ver colección
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-500" />
              </button>
            </motion.div>
          </div>

          {/* ═══ Calculadora — desktop full, mobile: chip + sheet ════════════ */}
          {/* Desktop */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease }}
            className="hidden md:flex w-full flex-1 min-w-0"
          >
            <GoldCalculator pricePerGram24k={goldPriceRaw} stretch />
          </motion.div>

          {/* Mobile — chip live + botón abrir calculadora */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6, ease }}
            className="flex md:hidden items-center justify-between w-full px-4 py-3"
            style={{
              background: 'rgba(10,9,5,0.75)',
              border: '1px solid rgba(212,175,55,0.18)',
              borderRadius: '4px',
              backdropFilter: 'blur(24px)',
            }}
          >
            {/* Precio live */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-sans uppercase tracking-[0.1em] text-cream-200/28 leading-none">
                Oro 24K · por gramo
              </span>
              <div className="flex items-center gap-2 mt-1">
                <motion.span
                  key={goldPriceRaw ?? 'loading'}
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="font-mono text-gold-400 font-bold text-lg leading-none"
                >
                  {goldPriceRaw
                    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(goldPriceRaw)
                    : '—'}
                </motion.span>
                <span
                  className="text-[8px] font-mono uppercase tracking-[0.1em] px-1.5 py-0.5"
                  style={{
                    color: 'rgba(100,210,120,0.9)',
                    background: 'rgba(100,210,120,0.07)',
                    border: '1px solid rgba(100,210,120,0.15)',
                    borderRadius: '2px',
                  }}
                >
                  ● live
                </span>
              </div>
            </div>
            {/* Botón abrir calculadora */}
            <button
              onClick={() => setIsSheetOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5"
              style={{
                background: 'rgba(212,175,55,0.1)',
                border: '1px solid rgba(212,175,55,0.35)',
                borderRadius: '3px',
              }}
            >
              <Calculator size={13} className="text-gold-400" />
              <span className="text-[10px] font-sans uppercase tracking-[0.15em] text-gold-400">
                Calcular
              </span>
            </button>
          </motion.div>

        </div>

        {/* Scroll indicator — mobile: en flujo debajo de la calculadora */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 2, ease }}
          onClick={() => {
            const el = document.getElementById('coleccion');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="flex md:hidden flex-col items-center gap-2 group cursor-pointer mx-auto mt-4"
        >
          <motion.span
            className="text-[9px] font-sans uppercase tracking-[0.25em] group-hover:text-gold-400/70 transition-colors duration-500"
            animate={{ color: ['rgba(242,240,237,0.3)', 'rgba(212,175,55,0.7)', 'rgba(242,240,237,0.3)'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            Conoce nuestra colección
          </motion.span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown size={14} className="text-cream-200/30 group-hover:text-gold-400/70 transition-colors duration-500" />
          </motion.div>
        </motion.button>

      </div>

      {/* Bottom rule */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.4, delay: 1.5, ease }}
        className="absolute bottom-0 left-0 right-0 h-px origin-left z-10"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15) 40%, rgba(212,175,55,0.15) 60%, transparent)' }}
      />

      {/* Scroll indicator — desktop: absolute centrado en la parte inferior */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 2, ease }}
        onClick={() => {
          const el = document.getElementById('coleccion');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        className="hidden md:flex absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex-col items-center gap-2 group cursor-pointer"
      >
        <motion.span
          className="text-[9px] font-sans uppercase tracking-[0.25em] group-hover:text-gold-400/70 transition-colors duration-500"
          animate={{ color: ['rgba(242,240,237,0.3)', 'rgba(212,175,55,0.7)', 'rgba(242,240,237,0.3)'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          Conoce nuestra colección
        </motion.span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={14} className="text-cream-200/30 group-hover:text-gold-400/70 transition-colors duration-500" />
        </motion.div>
      </motion.button>

      {/* Bottom Sheet calculadora — solo mobile */}
      <GoldCalculatorBottomSheet
        open={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        pricePerGram24k={goldPriceRaw}
      />
    </section>
  );
}
