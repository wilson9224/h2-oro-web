'use client';

import { User, Mail, Phone, Globe, DollarSign } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

function Field({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <label
        className="block text-[10px] font-sans-custom uppercase tracking-[0.18em] mb-1.5"
        style={{ color: 'rgba(242,240,237,0.3)' }}
      >
        {label}
      </label>
      <div
        className="flex min-w-0 items-center gap-2.5 rounded-xl px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Icon size={13} className="shrink-0" style={{ color: 'rgba(212,175,55,0.4)' }} />
        <span className="min-w-0 truncate text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.75)' }}>{value}</span>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="max-w-sm min-w-0 space-y-5 px-4 pb-4 pt-6 sm:px-5">
      {/* Header */}
      <div>
        <p className="text-[10px] font-sans-custom uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(212,175,55,0.5)' }}>
          Cuenta
        </p>
        <h1 className="font-display text-xl font-semibold" style={{ color: 'rgba(242,240,237,0.92)' }}>
          Mi Perfil
        </h1>
      </div>

      {/* Avatar card */}
      <div
        className="flex min-w-0 items-center gap-4 rounded-2xl p-5"
        style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.12)' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold font-display shrink-0"
          style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)', color: 'rgba(212,175,55,0.9)' }}
        >
          {user.firstName[0]}{user.lastName[0]}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold" style={{ color: 'rgba(242,240,237,0.9)' }}>
            {user.firstName} {user.lastName}
          </p>
          <p className="truncate text-xs font-sans-custom mt-0.5" style={{ color: 'rgba(242,240,237,0.35)' }}>
            {user.email}
          </p>
        </div>
      </div>

      {/* Fields */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field icon={User} label="Nombre"   value={user.firstName} />
          <Field icon={User} label="Apellido"  value={user.lastName} />
        </div>
        <Field icon={Mail}       label="Email"    value={user.email} />
        <Field icon={Phone}      label="Teléfono" value={user.phone || 'No registrado'} />
        <div className="grid grid-cols-2 gap-3">
          <Field icon={Globe}     label="Idioma"  value={user.preferredLang === 'es' ? 'Español' : 'English'} />
          <Field icon={DollarSign} label="Moneda" value={user.preferredCurr} />
        </div>
      </div>

      <p className="text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>
        Para actualizar tu información, contacta al administrador.
      </p>
    </div>
  );
}
