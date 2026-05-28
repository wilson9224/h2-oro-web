'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, ClipboardList, User, Bell, Wallet, X, Wrench, CreditCard, ChevronRight, CheckCircle2, Banknote } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

const ALLOWED_ROLES = ['jeweler', 'designer'];

interface PendingConfirmation {
  id: string;
  concept: string;
  serviceCode: string | null;
  amountCop: number;
  paidAt: string;
  paymentMethod: string | null;
  confirming: boolean;
  confirmed: boolean;
}

const SERVICE_CODE_LABELS: Record<string, string> = {
  casting: 'Fundición',
  design_easy: 'Diseño Fácil',
  design_medium: 'Diseño Medio',
  design_hard: 'Diseño Difícil',
  finishing_easy: 'Acabados Fácil',
  finishing_medium: 'Acabados Medio',
  finishing_hard: 'Acabados Difícil',
  assembly_easy: 'Armado Fácil',
  assembly_medium: 'Armado Medio',
  assembly_hard: 'Armado Difícil',
  setting_simple: 'Engaste Simple',
  setting_bezel: 'Engaste en Bisel',
  setting_pave: 'Engaste Pavé',
  laser_cutting_easy: 'Corte Láser Fácil',
  laser_cutting_medium: 'Corte Láser Medio',
  laser_cutting_hard: 'Corte Láser Difícil',
  laser_engraving_easy: 'Grabado Láser Fácil',
  laser_engraving_medium: 'Grabado Láser Medio',
  laser_engraving_hard: 'Grabado Láser Difícil',
  vulcanization_easy: 'Vulcanización Fácil',
  vulcanization_medium: 'Vulcanización Medio',
  vulcanization_hard: 'Vulcanización Difícil',
  '3d_printing': 'Impresión 3D',
};

const CONCEPT_LABELS: Record<string, string> = {
  assignment_payment: 'Pago por trabajo',
  bonus: 'Bonificación',
  adjustment: 'Ajuste',
};

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
  const supabase = createClient();
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

  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !ALLOWED_ROLES.includes(user.role))) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Load unconfirmed payments on mount
  useEffect(() => {
    if (!user) return;
    const fetchUnconfirmed = async () => {
      const { data } = await supabase
        .from('worker_payments')
        .select('id, concept, service_code, amount_cop, paid_at, payment_method')
        .eq('worker_id', user.id)
        .eq('status', 'paid')
        .is('confirmed_at', null)
        .order('paid_at', { ascending: false });

      if (data && data.length > 0) {
        setPendingConfirmations(
          data.map((p: any) => ({
            id: p.id,
            concept: p.concept,
            serviceCode: p.service_code ?? null,
            amountCop: Number(p.amount_cop),
            paidAt: p.paid_at,
            paymentMethod: p.payment_method ?? null,
            confirming: false,
            confirmed: false,
          }))
        );
        setShowConfirmModal(true);
      }
    };
    fetchUnconfirmed();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Also trigger modal when a new payment notification arrives via Realtime
  useEffect(() => {
    if (paymentNotifications.length === 0) return;
    setPendingConfirmations(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const incoming = paymentNotifications
        .filter(n => !existingIds.has(n.id))
        .map(n => ({
          id: n.id,
          concept: n.concept,
          serviceCode: null,
          amountCop: n.amountCop,
          paidAt: n.paidAt,
          paymentMethod: null,
          confirming: false,
          confirmed: false,
        }));
      return incoming.length > 0 ? [...prev, ...incoming] : prev;
    });
    setShowConfirmModal(true);
  }, [paymentNotifications]);

  const handleConfirmPayment = async (paymentId: string) => {
    if (!user) return;
    setPendingConfirmations(prev =>
      prev.map(p => p.id === paymentId ? { ...p, confirming: true } : p)
    );
    const { error } = await supabase
      .from('worker_payments')
      .update({ confirmed_at: new Date().toISOString() })
      .eq('id', paymentId)
      .eq('worker_id', user.id)
      .eq('status', 'paid');

    setPendingConfirmations(prev =>
      prev.map(p =>
        p.id === paymentId
          ? { ...p, confirming: false, confirmed: !error }
          : p
      )
    );
  };

  const allConfirmed = pendingConfirmations.length > 0 && pendingConfirmations.every(p => p.confirmed);

  const handleCloseModal = () => {
    setShowConfirmModal(false);
    setPendingConfirmations(prev => prev.filter(p => !p.confirmed));
    resetPaymentNotifications();
  };

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
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden" style={{ background: '#080808' }}>
      {/* Header — ultra minimal */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
        style={{
          background: 'rgba(8,8,8,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            style={{
              background: 'rgba(212,175,55,0.12)',
              border: '1px solid rgba(212,175,55,0.2)',
            }}
          >
            <span className="text-[10px] font-bold leading-none font-sans-custom" style={{ color: 'rgba(212,175,55,0.9)' }}>H</span>
          </div>
          <span className="font-display truncate text-sm tracking-tight font-sans-custom">
            <span style={{ color: 'rgba(242,240,237,0.8)' }}>H2 Oro</span>
          </span>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] font-sans-custom"
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
              className="fixed left-4 right-4 top-16 rounded-2xl overflow-hidden z-50 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72"
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
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto pb-28">
        {children}
      </main>

      {/* Bottom Navigation — pill style */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 sm:px-4"
        style={{
          background: 'linear-gradient(to top, rgba(8,8,8,1) 60%, rgba(8,8,8,0))',
        }}
      >
        <div
          className="grid grid-cols-4 gap-1 rounded-2xl px-1.5 py-1.5"
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
                className="relative flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 transition-all duration-300 active:scale-[0.98] sm:px-4"
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

      {/* Payment Confirmation Modal */}
      {showConfirmModal && pendingConfirmations.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="max-h-[calc(100dvh-1.5rem)] w-full max-w-sm overflow-hidden rounded-3xl"
            style={{
              background: 'rgba(14,13,12,0.98)',
              border: '1px solid rgba(212,175,55,0.15)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
            }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between gap-3 px-4 pb-4 pt-5 sm:px-5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}
                >
                  <Banknote className="w-4 h-4" style={{ color: 'rgba(212,175,55,0.9)' }} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>
                    Pago{pendingConfirmations.length > 1 ? 's' : ''} recibido{pendingConfirmations.length > 1 ? 's' : ''}
                  </p>
                  <p className="truncate text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                    Confirma que recibiste el dinero
                  </p>
                </div>
              </div>
              {allConfirmed && (
                <button
                  onClick={handleCloseModal}
                  className="p-2 rounded-xl transition-colors"
                  style={{ color: 'rgba(242,240,237,0.4)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Payment list */}
            <div className="max-h-72 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
              {pendingConfirmations.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl p-4"
                  style={{
                    background: p.confirmed
                      ? 'rgba(52,211,153,0.06)'
                      : 'rgba(255,255,255,0.04)',
                    border: p.confirmed
                      ? '1px solid rgba(52,211,153,0.15)'
                      : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium font-display truncate" style={{ color: 'rgba(242,240,237,0.85)' }}>
                        {(p.serviceCode ? SERVICE_CODE_LABELS[p.serviceCode] : null) ?? CONCEPT_LABELS[p.concept] ?? p.concept}
                      </p>
                      {p.paymentMethod && (
                        <p className="text-[10px] font-sans-custom mt-0.5" style={{ color: 'rgba(212,175,55,0.6)' }}>
                          {p.paymentMethod}
                        </p>
                      )}
                      <p className="text-[10px] font-sans-custom mt-0.5" style={{ color: 'rgba(242,240,237,0.25)' }}>
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : ''}
                      </p>
                    </div>
                    <div className="max-w-[8.5rem] flex-shrink-0 text-right">
                      <p className="truncate font-display text-base font-bold" style={{ color: 'rgba(212,175,55,0.95)' }}>
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(p.amountCop)}
                      </p>
                      {p.confirmed ? (
                        <span className="text-[10px] flex items-center justify-end gap-1 mt-1 font-sans-custom" style={{ color: 'rgba(52,211,153,0.8)' }}>
                          <CheckCircle2 className="w-2.5 h-2.5" /> Confirmado
                        </span>
                      ) : (
                        <button
                          onClick={() => handleConfirmPayment(p.id)}
                          disabled={p.confirming}
                          className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1.5 rounded-xl transition-all disabled:opacity-50 font-sans-custom"
                          style={{
                            background: 'rgba(212,175,55,0.12)',
                            border: '1px solid rgba(212,175,55,0.25)',
                            color: '#D4AF37',
                          }}
                        >
                          {p.confirming ? '...' : 'Confirmar'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-1">
              {allConfirmed ? (
                <button
                  onClick={handleCloseModal}
                  className="w-full py-3 rounded-2xl font-semibold text-sm font-sans-custom transition-colors"
                  style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.2)', color: 'rgba(52,211,153,0.9)' }}
                >
                  ¡Listo! Cerrar
                </button>
              ) : (
                <p className="text-center text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>
                  Confirma cada pago cuando hayas recibido el dinero
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
