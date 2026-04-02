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
  const x = useTransform(scrollYProgress, [0, 1], reverse ? ['-5%', '5%'] : ['5%', '-5%']);

  const track = items.join(' — ');

  return (
    <div ref={ref} className={`overflow-hidden py-6 md:py-8 ${className}`}>
      <motion.div style={{ x }} className="marquee-track">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="text-hero-sub font-serif italic text-cream-200/[0.06] select-none shrink-0"
          >
            {track} —{' '}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
