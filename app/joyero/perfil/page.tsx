'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { LogOut, Mail, Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
}

export default function JoyeroPerfilPage() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const supabase = createClient();

  const [monthEarnings, setMonthEarnings] = useState(0);
  const [monthCompleted, setMonthCompleted] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [loadingKpi, setLoadingKpi] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchKpi = async () => {
      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [{ data: payments }, { data: assignments }] = await Promise.all([
          supabase
            .from('worker_payments')
            .select('amount_cop, status, confirmed_at')
            .eq('worker_id', user.id)
            .gte('created_at', startOfMonth.toISOString()),
          supabase
            .from('work_assignments')
            .select('status, completed_at')
            .eq('worker_id', user.id)
            .eq('status', 'completed')
            .gte('completed_at', startOfMonth.toISOString()),
        ]);

        if (payments) {
          const earned = payments.filter(p => p.status === 'paid').reduce((s: number, p: any) => s + (p.amount_cop ?? 0), 0);
          const pending = payments.filter(p => p.status === 'pending').reduce((s: number, p: any) => s + (p.amount_cop ?? 0), 0);
          setMonthEarnings(earned);
          setPendingPayments(pending);
        }
        if (assignments) setMonthCompleted(assignments.length);
      } finally {
        setLoadingKpi(false);
      }
    };
    fetchKpi();
  }, [user]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try { await signOut(); } catch { setSigningOut(false); }
  };

  const roleLabel = user?.role === 'designer' ? 'Diseñador' : 'Joyero';
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : '?';
  const now = new Date();
  const monthName = now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border border-t-gold-500/80 border-gold-500/10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-w-0 pb-8">
      {/* Hero profile banner */}
      <div
        className="relative px-5 pt-8 pb-6 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.02) 60%, transparent 100%)',
          borderBottom: '1px solid rgba(212,175,55,0.1)',
        }}
      >
        <div
          className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)', filter: 'blur(24px)' }}
        />
        <div className="relative flex min-w-0 items-center gap-4">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center font-display text-xl font-bold flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))',
              border: '1px solid rgba(212,175,55,0.3)',
              color: '#D4AF37',
            }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>
              {user.firstName} {user.lastName}
            </h1>
            <span
              className="inline-block text-[9px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full mt-1 font-sans-custom"
              style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: 'rgba(212,175,55,0.8)' }}
            >
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* KPI — ganancias del mes */}
      <div className="px-5 mt-5">
        <p className="text-[9px] uppercase tracking-[0.2em] mb-3 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
          {monthName}
        </p>
        <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-3">
          {loadingKpi ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="min-w-0 animate-pulse rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', height: 64 }} />
            ))
          ) : (
            <>
              <div className="min-w-0 rounded-2xl p-3" style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.14)' }}>
                <p className="text-[9px] uppercase tracking-[0.1em] mb-1.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Cobrado</p>
                <p className="truncate font-display text-sm font-semibold leading-tight" style={{ color: 'rgba(52,211,153,1)' }}>{formatCOP(monthEarnings)}</p>
              </div>
              <div className="min-w-0 rounded-2xl p-3" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.14)' }}>
                <p className="text-[9px] uppercase tracking-[0.1em] mb-1.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Pendiente</p>
                <p className="truncate font-display text-sm font-semibold leading-tight" style={{ color: 'rgba(251,191,36,1)' }}>{formatCOP(pendingPayments)}</p>
              </div>
              <div className="min-w-0 rounded-2xl p-3" style={{ background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.14)' }}>
                <p className="text-[9px] uppercase tracking-[0.1em] mb-1.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Completados</p>
                <p className="font-display text-xl font-semibold" style={{ color: 'rgba(212,175,55,1)' }}>{monthCompleted}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Contact info */}
      <div className="px-5 mt-5">
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div
            className="flex items-center gap-3 px-4 py-3.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(212,175,55,0.5)' }} />
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.12em] mb-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Email</p>
              <p className="text-sm truncate font-sans-custom" style={{ color: 'rgba(242,240,237,0.75)' }}>{user.email}</p>
            </div>
          </div>
          {user.phone && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Phone className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(212,175,55,0.5)' }} />
              <div>
                <p className="text-[9px] uppercase tracking-[0.12em] mb-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Teléfono</p>
                <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.75)' }}>{user.phone}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sign out */}
      <div className="px-5 mt-4">
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200 disabled:opacity-50 font-sans-custom"
          style={{
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.15)',
            color: 'rgba(248,113,113,0.8)',
          }}
        >
          <LogOut className="w-4 h-4" />
          {signingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>
      </div>

      {/* Version */}
      <p className="text-center text-[10px] mt-6 font-sans-custom" style={{ color: 'rgba(242,240,237,0.15)' }}>
        H2 Oro · v1.0.0
      </p>
    </div>
  );
}
