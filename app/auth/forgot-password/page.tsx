'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Mail, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) throw resetError;
      setSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al enviar el correo';
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

            {sent ? (
              <>
                <div className="flex justify-center mb-4">
                  <CheckCircle size={40} style={{ color: 'rgba(16,185,129,0.8)' }} />
                </div>
                <h1 className="font-display text-xl font-semibold" style={{ color: 'rgba(242,240,237,0.92)' }}>
                  Correo enviado
                </h1>
                <p className="mt-2 text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                  Revisa tu bandeja de entrada en <strong style={{ color: 'rgba(242,240,237,0.6)' }}>{email}</strong> y sigue el enlace para restablecer tu contraseña.
                </p>
                <p className="mt-4 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>
                  Si no ves el correo, revisa tu carpeta de spam.
                </p>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-2xl text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-300 font-sans-custom"
                  style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400' }}
                >
                  Volver al login
                </Link>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <Mail size={32} style={{ color: 'rgba(212,175,55,0.6)' }} />
                </div>
                <h1 className="font-display text-xl font-semibold" style={{ color: 'rgba(242,240,237,0.92)' }}>
                  Recuperar contraseña
                </h1>
                <p className="mt-2 text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                  Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña
                </p>
              </>
            )}
          </div>

          {/* Form */}
          {!sent && (
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

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-[10px] tracking-[0.16em] uppercase mb-2 font-sans-custom"
                  style={{ color: 'rgba(242,240,237,0.4)' }}
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none transition-all duration-300 font-sans-custom"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(242,240,237,0.9)',
                  }}
                />
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
                  'Enviar enlace'
                )}
              </button>
            </form>
          )}

          {/* Back to login */}
          {!sent && (
            <p className="mt-6 text-center text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
              ¿Recordaste tu contraseña?{' '}
              <Link
                href="/auth/login"
                className="transition-colors duration-300 font-sans-custom"
                style={{ color: 'rgba(212,175,55,0.8)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(212,175,55,1)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(212,175,55,0.8)'}
              >
                Iniciar sesión
              </Link>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
