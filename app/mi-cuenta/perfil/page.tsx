'use client';

import { User, Mail, Phone, Globe, DollarSign } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-serif text-cream-100">Mi Perfil</h1>
        <p className="text-sm text-charcoal-400 mt-1">Información de tu cuenta</p>
      </div>

      {/* Avatar + Name */}
      <div className="bg-charcoal-800 rounded-lg border border-white/5 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 text-xl font-semibold">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div>
            <h2 className="text-lg text-cream-100">{user.firstName} {user.lastName}</h2>
            <p className="text-sm text-charcoal-400">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Nombre</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200">
                <User size={14} className="text-charcoal-500" />
                {user.firstName}
              </div>
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Apellido</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200">
                <User size={14} className="text-charcoal-500" />
                {user.lastName}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Email</label>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200">
              <Mail size={14} className="text-charcoal-500" />
              {user.email}
            </div>
          </div>

          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Teléfono</label>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200">
              <Phone size={14} className="text-charcoal-500" />
              {user.phone || 'No registrado'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Idioma</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200">
                <Globe size={14} className="text-charcoal-500" />
                {user.preferredLang === 'es' ? 'Español' : 'English'}
              </div>
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Moneda</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200">
                <DollarSign size={14} className="text-charcoal-500" />
                {user.preferredCurr}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-charcoal-500">
        Para actualizar tu información, contacta al administrador.
      </p>
    </div>
  );
}
