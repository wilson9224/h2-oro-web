'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, RefreshCw } from 'lucide-react';

interface GoldPrice {
  priceUsdOz: number;
  rateUsdCop: number;
  priceGram24k: number;
  fetchedAt: string;
}

const FALLBACK: GoldPrice = {
  priceUsdOz: 2350,
  rateUsdCop: 4200,
  priceGram24k: 317234.56,
  fetchedAt: new Date().toISOString(),
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function formatCOP(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUSD(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  return `Hace ${hours}h`;
}

export function GoldPriceTicker() {
  const [price, setPrice] = useState<GoldPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/gold-price/current`, {
        next: { revalidate: 900 },
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setPrice(data);
      setIsFallback(false);
    } catch {
      setPrice(FALLBACK);
      setIsFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  if (loading) {
    return (
      <div className="inline-flex items-center gap-3 px-5 py-3 rounded-sm glass animate-pulse">
        <div className="w-4 h-4 rounded-full bg-gold-500/20" />
        <div className="h-4 w-40 bg-gold-500/10 rounded" />
      </div>
    );
  }

  if (!price) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.9 }}
      className="inline-flex items-center gap-4 px-5 py-3 rounded-full bg-gold-500/5 border border-gold-500/20 backdrop-blur-sm"
    >
      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-500/60 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-500" />
        </span>
        <span className="text-[10px] uppercase tracking-[0.15em] text-gold-400/80 font-sans">
          Vivo
        </span>
      </div>

      {/* Main price - prominent */}
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-cream-200/60 font-sans">Oro 24K</span>
        <span className="text-xl md:text-2xl font-display font-semibold text-gold-400 tracking-tight">
          {formatCOP(price.priceGram24k)}
        </span>
        <span className="text-xs text-cream-200/40 font-sans">/g</span>
      </div>

      {/* Refresh indicator */}
      <div className="flex items-center gap-1.5 text-[10px] text-cream-200/30 font-sans">
        <RefreshCw size={10} className={isFallback ? 'text-amber-400' : ''} />
        <span>{isFallback ? 'Referencia' : timeAgo(price.fetchedAt)}</span>
      </div>
    </motion.div>
  );
}
