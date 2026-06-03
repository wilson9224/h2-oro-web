'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const supabase = createClient();

  // Supabase will automatically pick up the recovery token from the URL hash
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setSessionReady(true);
          setCheckingSession(false);
        }
      },
    );

    // Also check if there's already a session (user clicked link and session was set)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      }
      setCheckingSession(false);
    };

    // Give a brief moment for the auth state change to fire
    const timeout = setTimeout(checkSession, 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;
      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar la contraseña';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden" style={{ background: '#0A0A0A' }}>
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[50vw] h-[40vh] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }}
      />

      {/* Back link */}
      <div className="section-padding pt-6 relative z-10">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] transition-colors duration-300 font-sans-custom"
          style={{ color: 'rgba(242,240,237,0.3)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.7)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.3)'}
        >
          <ArrowLeft size={14} />
          Volver al login
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
          className="w-full max-w-sm"
        >
          {/* Logo + heading */}
          <div className="text-center mb-10">
            <Link href="/" className="inline-block mb-7">
              <span className="font-display text-3xl font-semibold tracking-tight">
                <span className="text-gold-400">H2</span>
                <span style={{ color: 'rgba(242,240,237,0.85)' }}> Oro</span>
              </span>
            </Link>

            {checkingSession ? (
              <>
                <Loader2 size={28} className="animate-spin mx-auto mb-4" style={{ color: 'rgba(212,175,55,0.6)' }} />
                <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                  Verificando enlace...
                </p>
              </>
            ) : success ? (
              <>
                <div className="flex justify-center mb-4">
                  <CheckCircle size={40} style={{ color: 'rgba(16,185,129,0.8)' }} />
                </div>
                <h1 className="font-display text-xl font-semibold" style={{ color: 'rgba(242,240,237,0.92)' }}>
                  Contraseña actualizada
                </h1>
                <p className="mt-2 text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                  Tu contraseña ha sido cambiada exitosamente. Serás redirigido al login...
                </p>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-2xl text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-300 font-sans-custom"
                  style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400' }}
                >
                  Ir al login
                </Link>
              </>
            ) : !sessionReady ? (
              <>
                <Lock size={32} className="mx-auto mb-4" style={{ color: 'rgba(248,113,113,0.6)' }} />
                <h1 className="font-display text-xl font-semibold" style={{ color: 'rgba(242,240,237,0.92)' }}>
                  Enlace inválido o expirado
                </h1>
                <p className="mt-2 text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                  El enlace de recuperación ya no es válido. Solicita uno nuevo.
                </p>
                <Link
                  href="/auth/forgot-password"
                  className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-2xl text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-300 font-sans-custom"
                  style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400' }}
                >
                  Solicitar nuevo enlace
                </Link>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <Lock size={32} style={{ color: 'rgba(212,175,55,0.6)' }} />
                </div>
                <h1 className="font-display text-xl font-semibold" style={{ color: 'rgba(242,240,237,0.92)' }}>
                  Nueva contraseña
                </h1>
                <p className="mt-2 text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                  Ingresa tu nueva contraseña
                </p>
              </>
            )}
          </div>

          {/* Form */}
          {sessionReady && !success && !checkingSession && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-2xl text-sm text-center"
                  style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'rgba(248,113,113,0.9)' }}
                >
                  {error}
                </motion.div>
              )}

              {/* New password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-[10px] tracking-[0.16em] uppercase mb-2 font-sans-custom"
                  style={{ color: 'rgba(242,240,237,0.4)' }}
                >
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-3 pr-12 rounded-2xl text-sm focus:outline-none transition-all duration-300 font-sans-custom"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'rgba(242,240,237,0.9)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'rgba(242,240,237,0.25)' }}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-[10px] tracking-[0.16em] uppercase mb-2 font-sans-custom"
                  style={{ color: 'rgba(242,240,237,0.4)' }}
                >
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Repite tu contraseña"
                    className="w-full px-4 py-3 pr-12 rounded-2xl text-sm focus:outline-none transition-all duration-300 font-sans-custom"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'rgba(242,240,237,0.9)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'rgba(242,240,237,0.25)' }}
                    aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-2 font-sans-custom"
                style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400' }}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  'Cambiar contraseña'
                )}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
