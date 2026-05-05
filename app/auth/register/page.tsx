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

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(242,240,237,0.9)',
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
              Crea tu cuenta
            </h1>
            <p className="mt-2 text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
              Únete y descubre nuestra colección exclusiva
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-2xl text-sm text-center font-sans-custom"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'rgba(248,113,113,0.9)' }}
              >
                {error}
              </motion.div>
            )}

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-[10px] tracking-[0.16em] uppercase mb-2 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
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
                  className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none transition-all duration-300 font-sans-custom"
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-[10px] tracking-[0.16em] uppercase mb-2 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
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
                  className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none transition-all duration-300 font-sans-custom"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-[10px] tracking-[0.16em] uppercase mb-2 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
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
                className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none transition-all duration-300 font-sans-custom"
                style={inputStyle}
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-[10px] tracking-[0.16em] uppercase mb-2 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                Teléfono <span style={{ color: 'rgba(242,240,237,0.2)' }}>(opcional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                autoComplete="tel"
                placeholder="+57 300 123 4567"
                className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none transition-all duration-300 font-sans-custom"
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-[10px] tracking-[0.16em] uppercase mb-2 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
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
                  className="w-full px-4 py-3 pr-12 rounded-2xl text-sm focus:outline-none transition-all duration-300 font-sans-custom"
                  style={inputStyle}
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-[10px] tracking-[0.16em] uppercase mb-2 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
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
                className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none transition-all duration-300 font-sans-custom"
                style={inputStyle}
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
                'Crear cuenta'
              )}
            </button>

            {/* Terms */}
            <p className="text-[10px] text-center leading-relaxed font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>
              Al crear una cuenta, aceptas nuestros{' '}
              <Link href="/terminos" className="transition-colors" style={{ color: 'rgba(212,175,55,0.5)' }}>
                Términos y Condiciones
              </Link>{' '}
              y{' '}
              <Link href="/privacidad" className="transition-colors" style={{ color: 'rgba(212,175,55,0.5)' }}>
                Política de Privacidad
              </Link>.
            </p>
          </form>

          {/* Divider */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>o</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Login link */}
          <p className="mt-6 text-center text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/auth/login"
              className="transition-colors duration-300 font-sans-custom"
              style={{ color: 'rgba(212,175,55,0.8)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(212,175,55,1)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(212,175,55,0.8)'}
            >
              Ingresar
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
