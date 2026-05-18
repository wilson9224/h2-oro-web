'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBag, User, CreditCard, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const navItems = [
  { label: 'Pedidos', href: '/mi-cuenta', icon: ShoppingBag },
  { label: 'Pagos', href: '/mi-cuenta/pagos', icon: CreditCard },
  { label: 'Perfil', href: '/mi-cuenta/perfil', icon: User },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080808' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border border-gold-500/10 animate-ping" />
            <div className="w-10 h-10 rounded-full border border-t-gold-500 border-gold-500/10 animate-spin" />
          </div>
          <span className="text-xs font-sans-custom tracking-[0.2em] uppercase" style={{ color: 'rgba(242,240,237,0.3)' }}>Cargando</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080808' }}>
      {/* Header — ultra minimal */}
      <header
        className="px-5 py-3.5 flex items-center justify-between sticky top-0 z-30"
        style={{
          background: 'rgba(8,8,8,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{
              background: 'rgba(212,175,55,0.12)',
              border: '1px solid rgba(212,175,55,0.2)',
            }}
          >
            <span className="text-[10px] font-bold leading-none font-sans-custom" style={{ color: 'rgba(212,175,55,0.9)' }}>H</span>
          </div>
          <Link href="/" className="font-display text-sm tracking-tight font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>
            H2 Oro
          </Link>
          <span
            className="text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full font-sans-custom"
            style={{
              background: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.15)',
              color: 'rgba(212,175,55,0.7)',
            }}
          >
            Mi Cuenta
          </span>
        </div>

        <button
          onClick={signOut}
          className="p-2 rounded-xl transition-colors font-sans-custom"
          style={{ color: 'rgba(242,240,237,0.35)' }}
          title="Cerrar sesión"
        >
          <LogOut size={16} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation — mismo estilo que /joyero */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-5 pt-2"
        style={{
          background: 'linear-gradient(to top, rgba(8,8,8,1) 60%, rgba(8,8,8,0))',
        }}
      >
        <div
          className="flex items-center justify-around rounded-2xl px-2 py-1.5"
          style={{
            background: 'rgba(20,20,20,0.95)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 -4px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
          }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/mi-cuenta' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl transition-all duration-300 min-w-[60px]"
                style={{
                  background: isActive ? 'rgba(212,175,55,0.1)' : 'transparent',
                  color: isActive ? '#D4AF37' : 'rgba(242,240,237,0.35)',
                }}
              >
                <Icon
                  className="w-[18px] h-[18px]"
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <span
                  className="text-[9px] font-medium tracking-[0.08em] uppercase font-sans-custom"
                  style={{ color: isActive ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.3)' }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
