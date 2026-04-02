'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/catalogo', label: 'Colección' },
  { href: '/proceso', label: 'Proceso' },
  { href: '/seguimiento', label: 'Mi Pedido' },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-700',
          scrolled
            ? 'bg-[#0A0A0A]/80 backdrop-blur-2xl'
            : 'bg-transparent'
        )}
      >
        <div className="section-padding">
          <nav className="flex items-center justify-between h-14 md:h-18">
            {/* Logo */}
            <Link href="/" className="relative z-50">
              <span className="font-serif text-xl tracking-tight">
                <span className="text-gold-400 font-semibold">H2</span>
                <span className="text-cream-200 font-light"> Oro</span>
              </span>
            </Link>

            {/* Desktop nav — clean, spaced */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="link-hover text-xs uppercase tracking-[0.12em] font-sans"
                >
                  {link.label}
                </Link>
              ))}
              <div className="w-px h-4 bg-cream-200/10 mx-2" />
              <Link
                href="/auth/login"
                className="link-hover text-xs uppercase tracking-[0.12em] font-sans"
              >
                Ingresar
              </Link>
              <Link href="/catalogo" className="btn-pill text-[10px] px-5 py-2">
                Explorar
              </Link>
            </div>

            {/* Mobile toggle — minimal line design */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="relative z-50 md:hidden w-8 h-8 flex flex-col items-end justify-center gap-1.5"
              aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              <motion.span
                animate={isOpen ? { rotate: 45, y: 5, width: '100%' } : { rotate: 0, y: 0, width: '100%' }}
                className="block h-px bg-cream-200 origin-center"
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.span
                animate={isOpen ? { rotate: -45, y: -3, width: '100%' } : { rotate: 0, y: 0, width: '60%' }}
                className="block h-px bg-cream-200 origin-center"
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile fullscreen menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 bg-[#0A0A0A] md:hidden"
          >
            <nav className="flex flex-col justify-between h-full section-padding pt-24 pb-12">
              <div className="space-y-0">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="group flex items-baseline justify-between py-6 border-b border-cream-200/[0.06]"
                    >
                      <span className="font-serif text-display-md text-cream-100 group-hover:text-gold-400 transition-colors duration-500">
                        {link.label}
                      </span>
                      <span className="text-label text-cream-200/20 font-mono">
                        0{i + 1}
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="flex gap-3"
              >
                <Link
                  href="/auth/login"
                  onClick={() => setIsOpen(false)}
                  className="btn-pill-outline flex-1 justify-center"
                >
                  Ingresar
                </Link>
                <Link
                  href="/catalogo"
                  onClick={() => setIsOpen(false)}
                  className="btn-pill flex-1 justify-center"
                >
                  Explorar
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
