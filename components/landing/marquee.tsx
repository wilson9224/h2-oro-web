'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { BadgeCheck, Gem, Hammer, Scale, Sparkles, Truck } from 'lucide-react';
import { useRef } from 'react';

interface MarqueeProps {
  items: string[];
  reverse?: boolean;
  className?: string;
  iconMode?: boolean | 'jewelry' | 'services';
}

const serviceIcons = [Gem, Hammer, Scale, Sparkles, BadgeCheck, Truck];
const jewelryIcons = [Gem, Sparkles, Gem, Sparkles, BadgeCheck, Gem];

export function Marquee({ items, reverse = false, className = '', iconMode = false }: MarqueeProps) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const x = useTransform(scrollYProgress, [0, 1], reverse ? ['-4%', '4%'] : ['4%', '-4%']);

  return (
    <div
      ref={ref}
      className={`overflow-hidden relative ${className}`}
      style={{
        borderTop: '1px solid rgba(212,175,55,0.08)',
        borderBottom: '1px solid rgba(212,175,55,0.08)',
        padding: '14px 0',
      }}
    >
      <motion.div
        style={{ x, width: 'max-content' }}
        className="flex gap-0 whitespace-nowrap"
      >
        {[0, 1, 2, 3, 4].map((rep) => (
          <span key={rep} className="flex items-center shrink-0">
            {items.map((item, i) => (
              <span key={i} className="flex items-center">
                <span className="flex items-center gap-2.5 px-5 text-[11px] uppercase tracking-[0.22em] text-cream-200/25 select-none font-sans-custom md:text-[13px]">
                  {iconMode ? (
                    (() => {
                      const icons = iconMode === 'jewelry' ? jewelryIcons : serviceIcons;
                      const Icon = icons[i % icons.length];
                      return <Icon size={14} strokeWidth={1.5} className="text-gold-400/45" />;
                    })()
                  ) : null}
                  {item}
                </span>
                <span
                  className="w-1 h-1 rounded-full shrink-0"
                  style={{ background: 'rgba(212,175,55,0.35)' }}
                />
              </span>
            ))}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
