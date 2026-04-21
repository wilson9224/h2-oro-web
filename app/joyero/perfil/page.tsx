'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { User, LogOut, Mail, Phone, Settings } from 'lucide-react';

export default function JoyeroPerfilPage() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setSigningOut(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gold-500">Mi Perfil</h1>
        <p className="text-charcoal-400">Información de tu cuenta</p>
      </div>

      {/* Profile Card */}
      <div className="bg-charcoal-900 rounded-lg p-6 border border-charcoal-800">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-gold-500 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-charcoal-900" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gold-400">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-charcoal-400">Joyería</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-charcoal-400" />
            <div>
              <p className="text-sm text-charcoal-400">Email</p>
              <p className="text-charcoal-300">{user.email}</p>
            </div>
          </div>

          {user.phone && (
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-charcoal-400" />
              <div>
                <p className="text-sm text-charcoal-400">Teléfono</p>
                <p className="text-charcoal-300">{user.phone}</p>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <Settings className="w-5 h-5 text-charcoal-400" />
            <div>
              <p className="text-sm text-charcoal-400">Idioma preferido</p>
              <p className="text-charcoal-300">Español</p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="space-y-3">
        <div className="bg-charcoal-900 rounded-lg p-4 border border-charcoal-800">
          <h3 className="text-lg font-semibold text-gold-500 mb-4">Acciones de cuenta</h3>
          
          <div className="space-y-3">
            <button className="w-full bg-charcoal-800 text-charcoal-300 py-3 rounded-lg hover:bg-charcoal-700 transition-colors flex items-center justify-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Configuración (Próximamente)</span>
            </button>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>{signingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="text-center text-charcoal-500 text-sm">
        <p>H2 Oro - Panel Joyero</p>
        <p className="text-xs mt-1">Versión 1.0.0</p>
      </div>
    </div>
  );
}
