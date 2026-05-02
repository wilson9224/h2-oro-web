'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

function redirectByRole(role: string): string {
  switch (role) {
    case 'admin':
    case 'manager':
      return '/admin';
    case 'jeweler':
      return '/joyero';
    case 'designer':
      return '/admin';
    case 'client':
      return '/mi-cuenta';
    default:
      return '/';
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      router.push(redirectByRole(user.role));
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('=== INICIO LOGIN ===');
    console.log('Email:', email);
    console.log('Password length:', password.length);

    try {
      console.log('Intentando signIn...');
      await signIn(email, password);
      console.log('SignIn exitoso');
    } catch (err: unknown) {
      console.error('Error en login:', err);
      const message = err instanceof Error ? err.message : 'Credenciales inválidas';
      console.error('Mensaje de error:', message);
      setError(message);
    } finally {
      setLoading(false);
      console.log('=== FIN LOGIN ===');
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0A' }}>
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[50vw] h-[40vh] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }}
      />

      {/* Back link */}
      <div className="section-padding pt-6 relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] transition-colors duration-300 font-sans-custom"
          style={{ color: 'rgba(242,240,237,0.3)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.7)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.3)'}
        >
          <ArrowLeft size={14} />
          Volver
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
            <h1 className="font-display text-xl font-semibold" style={{ color: 'rgba(242,240,237,0.92)' }}>
              Bienvenido de vuelta
            </h1>
            <p className="mt-2 text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
              Ingresa a tu cuenta para continuar
            </p>
          </div>

          {/* Form */}
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

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-[10px] tracking-[0.16em] uppercase font-sans-custom"
                  style={{ color: 'rgba(242,240,237,0.4)' }}
                >
                  Contraseña
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-[10px] transition-colors duration-300 font-sans-custom"
                  style={{ color: 'rgba(212,175,55,0.5)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(212,175,55,0.9)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(212,175,55,0.5)'}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
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
                'Ingresar'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 flex items-center gap-4 font-sans-custom">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>o</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Register link */}
          <p className="mt-6 text-center text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
            ¿No tienes cuenta?{' '}
            <Link
              href="/auth/register"
              className="transition-colors duration-300 font-sans-custom"
              style={{ color: 'rgba(212,175,55,0.8)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(212,175,55,1)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(212,175,55,0.8)'}
            >
              Crear cuenta
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
