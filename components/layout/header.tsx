'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, PackageSearch } from 'lucide-react';
import { cn } from '@/lib/utils';

const actionLinks = [
  { href: '/seguimiento', label: 'Mi pedido', icon: PackageSearch, tone: 'primary' },
  { href: '/auth/login', label: 'Ingresar', icon: LogIn, tone: 'secondary' },
] as const;

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
          <nav className="relative flex items-center justify-between h-14 md:h-18">
            {/* Logo */}
            <Link href="/" className="relative z-50">
              <span className="font-display text-xl tracking-tight">
                <span className="text-gold-400 font-semibold">H2</span>
                <span className="text-cream-200 font-light"> Oro</span>
              </span>
            </Link>

            {/* Desktop actions */}
            <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-cream-200/[0.08] bg-[#080806]/62 p-1.5 shadow-[0_12px_34px_rgba(0,0,0,0.28)] backdrop-blur-2xl md:flex">
              {actionLinks.map((link) => {
                const Icon = link.icon;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'group inline-flex h-10 items-center gap-2 rounded-full px-4 text-[10px] font-semibold uppercase tracking-[0.16em] font-sans-custom transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/45 active:scale-[0.97]',
                      link.tone === 'primary'
                        ? 'bg-gold-500 text-black shadow-[0_0_0_1px_rgba(245,230,204,0.18),0_10px_28px_rgba(212,175,55,0.22)] hover:bg-gold-400 hover:shadow-[0_0_0_1px_rgba(245,230,204,0.28),0_14px_36px_rgba(212,175,55,0.3)]'
                        : 'border border-cream-200/[0.12] bg-cream-200/[0.035] text-cream-100/78 hover:border-gold-400/35 hover:bg-gold-400/[0.08] hover:text-cream-100'
                    )}
                  >
                    <Icon
                      size={15}
                      strokeWidth={1.7}
                      className={cn(
                        'transition-transform duration-300 group-hover:-translate-y-px',
                        link.tone === 'primary' ? 'text-black' : 'text-gold-400/72'
                      )}
                    />
                    {link.label}
                  </Link>
                );
              })}
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
              <div className="space-y-3">
                {actionLinks.map((link, i) => {
                  const Icon = link.icon;

                  return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'group flex items-center justify-between rounded-2xl border p-5 transition-all duration-300 active:scale-[0.98]',
                        link.tone === 'primary'
                          ? 'border-gold-500/40 bg-gold-500 text-black shadow-[0_18px_44px_rgba(212,175,55,0.2)]'
                          : 'border-cream-200/[0.08] bg-cream-200/[0.035] text-cream-100'
                      )}
                    >
                      <span className="flex items-center gap-4">
                        <span
                          className={cn(
                            'flex h-11 w-11 items-center justify-center rounded-xl border transition-colors',
                            link.tone === 'primary'
                              ? 'border-black/10 bg-black/[0.08] text-black'
                              : 'border-gold-400/22 bg-gold-400/[0.08] text-gold-400'
                          )}
                        >
                          <Icon size={18} strokeWidth={1.7} />
                        </span>
                        <span
                          className={cn(
                            'font-display text-3xl leading-none transition-colors duration-500',
                            link.tone === 'primary' ? 'text-black' : 'text-cream-100'
                          )}
                        >
                          {link.label}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'font-mono text-[10px]',
                          link.tone === 'primary' ? 'text-black/40' : 'text-cream-200/20'
                        )}
                      >
                        0{i + 1}
                      </span>
                    </Link>
                  </motion.div>
                  );
                })}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
