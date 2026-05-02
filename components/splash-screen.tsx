'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BUBBLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${5 + Math.random() * 90}%`,
  size: Math.random() * 80 + 16,
  delay: Math.random() * 1.2,
  duration: 1.8 + Math.random() * 1.4,
  opacity: 0.08 + Math.random() * 0.18,
}));

export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          style={{ background: '#080808' }}
        >
          {/* Radial gold glow behind logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div
              className="w-[40vw] h-[40vw] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
            />
          </motion.div>

          {/* Bubbles rising */}
          <div className="absolute inset-0 pointer-events-none">
            {BUBBLES.map((b) => (
              <motion.div
                key={b.id}
                className="absolute rounded-full"
                style={{
                  left: b.left,
                  bottom: '-10%',
                  width: b.size,
                  height: b.size,
                  background: `radial-gradient(circle at 35% 35%, rgba(212,175,55,${b.opacity * 2}), rgba(212,175,55,${b.opacity * 0.3}))`,
                  border: `1px solid rgba(212,175,55,${b.opacity})`,
                }}
                animate={{
                  y: [0, -(window?.innerHeight ?? 900) * 1.2],
                  opacity: [0, b.opacity * 4, 0],
                  scale: [0.6, 1, 0.8],
                }}
                transition={{
                  duration: b.duration,
                  delay: b.delay,
                  ease: 'easeOut',
                  repeat: 0,
                }}
              />
            ))}
          </div>

          {/* Center content */}
          <div className="relative z-10 flex flex-col items-center gap-6">
            {/* Logo mark */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-3"
            >
              {/* Decorative diamond */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 45 }}
                transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="w-3 h-3 border border-gold-500/60"
                style={{ transform: 'rotate(45deg)' }}
              />

              <h1
                className="font-display tracking-tight leading-none"
                style={{ fontSize: 'clamp(3.5rem, 12vw, 8rem)' }}
              >
                <span className="text-gold-400 font-semibold">H2</span>
                <span className="text-cream-200/90 font-extralight"> Oro</span>
              </h1>

              {/* Animated gold line */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="h-px w-full origin-center"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.8), transparent)',
                }}
              />

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1, ease: 'easeOut' }}
                className="text-cream-200/30 font-sans text-xs tracking-[0.3em] uppercase"
              >
                Joyería artesanal · Colombia
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
