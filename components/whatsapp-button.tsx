'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const WHATSAPP_NUMBER = '573196518919';

const WA_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export function WhatsAppButton() {
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    const message = encodeURIComponent('Hola, me gustaría obtener más información sobre sus joyas.');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  return (
    <motion.button
      onClick={handleClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      initial={{ scale: 0, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ delay: 2.8, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileTap={{ scale: 0.92 }}
      className="fixed bottom-4 right-4 z-50 flex items-center sm:bottom-6 sm:right-6"
      aria-label="Contactar por WhatsApp"
    >
      {/* Tooltip label */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: 8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mr-3 hidden whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium text-cream-100 pointer-events-none font-sans-custom sm:block"
            style={{
              background: 'rgba(10,10,10,0.92)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            }}
          >
            Escríbenos
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outer glow ring — pulsing */}
      <motion.span
        className="absolute inset-0 rounded-full"
        animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: 'rgba(212,175,55,0.3)' }}
      />

      {/* Button body */}
      <motion.div
        animate={{ scale: hovered ? 1.08 : 1 }}
        transition={{ duration: 0.25 }}
        className="relative flex h-12 w-12 items-center justify-center rounded-full sm:h-14 sm:w-14"
        style={{
          background: 'linear-gradient(135deg, #E8C547, #D4AF37, #B8960F)',
          color: '#1A1400',
          boxShadow: hovered
            ? '0 0 0 1px rgba(212,175,55,0.5), 0 12px 40px rgba(212,175,55,0.35)'
            : '0 0 0 1px rgba(212,175,55,0.3), 0 6px 24px rgba(212,175,55,0.2)',
        }}
      >
        {WA_ICON}
      </motion.div>
    </motion.button>
  );
}
