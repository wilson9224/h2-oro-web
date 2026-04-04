'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading, signUp } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/mi-cuenta');
    }
  }, [user, authLoading, router]);

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await signUp({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
      });
      router.push('/mi-cuenta');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear la cuenta. Intenta de nuevo.';
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
              Crea tu cuenta
            </h1>
            <p className="mt-2 text-sm text-charcoal-300">
              Únete y descubre nuestra colección exclusiva
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

            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-xs tracking-[0.15em] uppercase text-charcoal-300 mb-2"
                >
                  Nombre
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={form.firstName}
                  onChange={(e) => update('firstName', e.target.value)}
                  required
                  autoComplete="given-name"
                  placeholder="María"
                  className="w-full px-4 py-3 bg-charcoal-800 border border-gold-500/10 rounded-sm text-cream-200 text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/40 transition-colors duration-300"
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-xs tracking-[0.15em] uppercase text-charcoal-300 mb-2"
                >
                  Apellido
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={form.lastName}
                  onChange={(e) => update('lastName', e.target.value)}
                  required
                  autoComplete="family-name"
                  placeholder="García"
                  className="w-full px-4 py-3 bg-charcoal-800 border border-gold-500/10 rounded-sm text-cream-200 text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/40 transition-colors duration-300"
                />
              </div>
            </div>

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
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
                autoComplete="email"
                placeholder="tu@email.com"
                className="w-full px-4 py-3 bg-charcoal-800 border border-gold-500/10 rounded-sm text-cream-200 text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/40 transition-colors duration-300"
              />
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-xs tracking-[0.15em] uppercase text-charcoal-300 mb-2"
              >
                Teléfono
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                autoComplete="tel"
                placeholder="+57 300 123 4567"
                className="w-full px-4 py-3 bg-charcoal-800 border border-gold-500/10 rounded-sm text-cream-200 text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/40 transition-colors duration-300"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs tracking-[0.15em] uppercase text-charcoal-300 mb-2"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
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

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs tracking-[0.15em] uppercase text-charcoal-300 mb-2"
              >
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                className="w-full px-4 py-3 bg-charcoal-800 border border-gold-500/10 rounded-sm text-cream-200 text-sm placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/40 transition-colors duration-300"
              />
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
                'Crear cuenta'
              )}
            </button>

            {/* Terms */}
            <p className="text-[11px] text-charcoal-500 text-center leading-relaxed">
              Al crear una cuenta, aceptas nuestros{' '}
              <Link href="#" className="text-gold-500/50 hover:text-gold-400 transition-colors">
                Términos y Condiciones
              </Link>{' '}
              y{' '}
              <Link href="#" className="text-gold-500/50 hover:text-gold-400 transition-colors">
                Política de Privacidad
              </Link>
              .
            </p>
          </form>

          {/* Divider */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-xs text-charcoal-500">o</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Login link */}
          <p className="mt-8 text-center text-sm text-charcoal-400">
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/auth/login"
              className="text-gold-400 hover:text-gold-300 transition-colors duration-300"
            >
              Ingresar
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
