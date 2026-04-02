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
      className="inline-flex flex-col sm:flex-row items-center gap-4 sm:gap-6 px-6 py-4 rounded-sm glass gold-border"
    >
      {/* Main price */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gold-500/10 border border-gold-500/20">
          <TrendingUp size={14} className="text-gold-400" />
        </div>
        <div>
          <p className="text-[10px] tracking-[0.15em] uppercase text-charcoal-400">
            Oro 24K / gramo
          </p>
          <p className="text-lg font-serif text-gold-400 leading-tight">
            {formatCOP(price.priceGram24k)}
          </p>
        </div>
      </div>

      {/* Separator */}
      <div className="hidden sm:block w-px h-8 bg-white/5" />

      {/* USD reference + timestamp */}
      <div className="flex items-center gap-4 text-[11px] text-charcoal-400">
        <div>
          <span className="block text-charcoal-500">USD/oz</span>
          <span className="text-cream-300">{formatUSD(price.priceUsdOz)}</span>
        </div>
        <div>
          <span className="block text-charcoal-500">USD/COP</span>
          <span className="text-cream-300">{formatCOP(price.rateUsdCop)}</span>
        </div>
        <div className="flex items-center gap-1 text-charcoal-500">
          <RefreshCw size={10} />
          <span>{isFallback ? 'Ref.' : timeAgo(price.fetchedAt)}</span>
        </div>
      </div>
    </motion.div>
  );
}
