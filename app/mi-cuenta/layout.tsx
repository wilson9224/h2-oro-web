'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShoppingBag,
  User,
  CreditCard,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const navItems = [
  { label: 'Mis Pedidos', href: '/mi-cuenta', icon: ShoppingBag },
  { label: 'Pagos', href: '/mi-cuenta/pagos', icon: CreditCard },
  { label: 'Mi Perfil', href: '/mi-cuenta/perfil', icon: User },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-charcoal-900">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-charcoal-800/90 backdrop-blur border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-serif text-xl font-semibold tracking-tight">
              <span className="text-gold-400">H2</span>
              <span className="text-cream-200"> Oro</span>
            </Link>
            <span className="hidden sm:block text-xs text-charcoal-500">|</span>
            <span className="hidden sm:block text-xs text-charcoal-400">Mi Cuenta</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-gold-500/10 text-gold-400'
                      : 'text-charcoal-300 hover:bg-white/5 hover:text-cream-200'
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              );
            })}
            <div className="ml-2 pl-2 border-l border-white/5 flex items-center gap-2">
              <span className="text-xs text-charcoal-400">{user.firstName}</span>
              <button
                onClick={signOut}
                className="p-1.5 rounded hover:bg-white/5 text-charcoal-500 hover:text-red-400 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          </nav>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileNav(!mobileNav)} className="md:hidden text-charcoal-300">
            {mobileNav ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileNav && (
          <nav className="md:hidden border-t border-white/5 bg-charcoal-800 px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNav(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm ${
                    isActive ? 'bg-gold-500/10 text-gold-400' : 'text-charcoal-300'
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={signOut}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-charcoal-400 hover:text-red-400 w-full"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </nav>
        )}
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">{children}</main>
    </div>
  );
}
