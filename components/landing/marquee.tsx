'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

interface MarqueeProps {
  items: string[];
  reverse?: boolean;
  className?: string;
}

export function Marquee({ items, reverse = false, className = '' }: MarqueeProps) {
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
                <span className="text-[11px] md:text-[13px] font-sans uppercase tracking-[0.22em] text-cream-200/25 select-none px-5">
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
