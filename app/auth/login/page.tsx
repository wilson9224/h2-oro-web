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

    try {
      await signIn(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Credenciales inválidas';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-charcoal-900">
      {/* Back link */}
      <div className="section-padding pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-charcoal-400 hover:text-cream-200 transition-colors duration-300"
        >
          <ArrowLeft size={16} />
          Volver al inicio
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-10">
            <Link href="/" className="inline-block mb-8">
              <span className="font-serif text-3xl font-semibold tracking-tight">
                <span className="text-gold-400">H2</span>
                <span className="text-cream-200"> Oro</span>
              </span>
            </Link>
            <h1 className="font-serif text-2xl text-cream-100">
              Bienvenido de vuelta
            </h1>
            <p className="mt-2 text-sm text-charcoal-300">
              Ingresa a tu cuenta para continuar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-sm bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs tracking-[0.15em] uppercase text-charcoal-300 mb-2"
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
                className="w-full px-4 py-3 bg-charcoal-800 border border-gold-500/10 rounded-sm text-cream-200 text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/40 transition-colors duration-300"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-xs tracking-[0.15em] uppercase text-charcoal-300"
                >
                  Contraseña
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-gold-500/60 hover:text-gold-400 transition-colors duration-300"
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
                  className="w-full px-4 py-3 pr-12 bg-charcoal-800 border border-gold-500/10 rounded-sm text-cream-200 text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/40 transition-colors duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-300 transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-xs text-charcoal-500">o</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Register link */}
          <p className="mt-8 text-center text-sm text-charcoal-400">
            ¿No tienes cuenta?{' '}
            <Link
              href="/auth/register"
              className="text-gold-400 hover:text-gold-300 transition-colors duration-300"
            >
              Crear cuenta
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
