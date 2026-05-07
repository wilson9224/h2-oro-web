'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, ClipboardList, User, Bell, Wallet, X, Wrench, CreditCard, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import Link from 'next/link';

const ALLOWED_ROLES = ['jeweler', 'designer'];

const navItems = [
  { label: 'Inicio', href: '/joyero', icon: Home },
  { label: 'Trabajos', href: '/joyero/pedidos', icon: ClipboardList },
  { label: 'Pagos', href: '/joyero/pagos', icon: Wallet },
  { label: 'Perfil', href: '/joyero/perfil', icon: User },
];

export default function JoyeroLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const {
    notificationCount,
    newNotifications,
    resetNotifications,
    paymentNotificationCount,
    paymentNotifications,
    resetPaymentNotifications,
  } = useRealtimeNotifications(user?.id || '');

  useEffect(() => {
    if (!loading && (!user || !ALLOWED_ROLES.includes(user.role))) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (pathname === '/joyero/pedidos') {
      resetNotifications();
    }
    if (pathname === '/joyero/pagos') {
      resetPaymentNotifications();
    }
  }, [pathname, resetNotifications, resetPaymentNotifications]);

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

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return null;
  }

  const roleLabel = user.role === 'designer' ? 'Diseño' : 'Joyería';
  const totalNotifications = notificationCount + paymentNotificationCount;

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
          <span className="font-display text-sm tracking-tight font-sans-custom">
            <span style={{ color: 'rgba(242,240,237,0.8)' }}>H2 Oro</span>
          </span>
          <span
            className="text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full font-sans-custom"
            style={{
              background: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.15)',
              color: 'rgba(212,175,55,0.7)',
            }}
          >
            {roleLabel}
          </span>
        </div>

        {/* Bell */}
        <div className="relative">
          <button
            ref={bellRef}
            onClick={() => setShowNotifications(v => !v)}
            className="relative p-2 -mr-1.5 rounded-xl transition-colors font-sans-custom"
            style={{ color: showNotifications ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.5)' }}
          >
            <Bell className="w-[18px] h-[18px]" />
            {totalNotifications > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: '#D4AF37', boxShadow: '0 0 6px rgba(212,175,55,0.6)' }}
              />
            )}
          </button>

          {/* Notification panel */}
          {showNotifications && (
            <div
              className="absolute right-0 top-full mt-2 w-72 rounded-2xl overflow-hidden z-50"
              style={{
                background: 'rgba(14,13,12,0.98)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
              }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-xs font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>Notificaciones</span>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 rounded-lg"
                  style={{ color: 'rgba(242,240,237,0.3)' }}
                >
                  <X size={13} />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {/* Work assignment notifications */}
                {newNotifications.length > 0 && newNotifications.map((n) => (
                  <Link
                    key={n.id}
                    href={`/joyero/pedidos`}
                    onClick={() => { resetNotifications(); setShowNotifications(false); }}
                    className="flex items-start gap-3 px-4 py-3 transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.18)' }}>
                      <Wrench size={12} style={{ color: 'rgba(212,175,55,0.8)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold font-sans-custom truncate" style={{ color: 'rgba(242,240,237,0.8)' }}>
                        Nueva tarea asignada
                      </p>
                      <p className="text-[10px] mt-0.5 font-sans-custom truncate" style={{ color: 'rgba(242,240,237,0.35)' }}>
                        {n.orderNumber ? `#${n.orderNumber} · ` : ''}{n.stageName}
                      </p>
                    </div>
                    <ChevronRight size={12} className="shrink-0 mt-1" style={{ color: 'rgba(242,240,237,0.2)' }} />
                  </Link>
                ))}

                {/* Payment notifications */}
                {paymentNotifications.length > 0 && paymentNotifications.map((p) => (
                  <Link
                    key={p.id}
                    href="/joyero/pagos"
                    onClick={() => { resetPaymentNotifications(); setShowNotifications(false); }}
                    className="flex items-start gap-3 px-4 py-3 transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}>
                      <CreditCard size={12} style={{ color: 'rgba(52,211,153,0.8)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>
                        Pago registrado
                      </p>
                      <p className="text-[10px] mt-0.5 font-sans-custom" style={{ color: 'rgba(52,211,153,0.6)' }}>
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.amountCop)}
                      </p>
                    </div>
                    <ChevronRight size={12} className="shrink-0 mt-1" style={{ color: 'rgba(242,240,237,0.2)' }} />
                  </Link>
                ))}

                {/* Empty state */}
                {newNotifications.length === 0 && paymentNotifications.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <Bell size={20} className="mx-auto mb-2" style={{ color: 'rgba(242,240,237,0.1)' }} />
                    <p className="text-[11px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>Sin notificaciones nuevas</p>
                  </div>
                )}
              </div>

              {/* Footer with mark all read */}
              {totalNotifications > 0 && (
                <div className="px-4 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <button
                    onClick={() => { resetNotifications(); resetPaymentNotifications(); setShowNotifications(false); }}
                    className="w-full text-[10px] uppercase tracking-widest font-sans-custom transition-colors"
                    style={{ color: 'rgba(212,175,55,0.5)' }}
                  >
                    Marcar todo como leído
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation — pill style */}
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
            const isActive = pathname === item.href || (item.href !== '/joyero' && pathname.startsWith(item.href));
            const Icon = item.icon;
            const showBadge =
              (item.href === '/joyero/pedidos' && notificationCount > 0) ||
              (item.href === '/joyero/pagos' && paymentNotificationCount > 0);

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
                {showBadge && (
                  <span
                    className="absolute top-2 right-3 w-1.5 h-1.5 rounded-full"
                    style={{
                      background: '#D4AF37',
                      boxShadow: '0 0 4px rgba(212,175,55,0.8)',
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
