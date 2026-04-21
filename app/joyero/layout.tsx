'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, ClipboardList, User, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import Link from 'next/link';

const navItems = [
  { label: 'Inicio', href: '/joyero', icon: Home },
  { label: 'Pedidos', href: '/joyero/pedidos', icon: ClipboardList },
  { label: 'Perfil', href: '/joyero/perfil', icon: User },
];

export default function JoyeroLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { notificationCount, resetNotifications } = useRealtimeNotifications(user?.id || '');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'jeweler')) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Reset notifications when user visits orders page
  useEffect(() => {
    if (pathname === '/joyero/pedidos') {
      resetNotifications();
    }
  }, [pathname, resetNotifications]);

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.role !== 'jeweler') {
    return null;
  }

  return (
    <div className="min-h-screen bg-charcoal-950 flex flex-col">
      {/* Header */}
      <header className="bg-charcoal-900 border-b border-charcoal-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-gold-500 font-bold text-lg">H2 Oro</h1>
          <span className="text-charcoal-300 text-sm">Hola, {user.firstName}</span>
        </div>
        <div className="relative">
          <Bell className="w-5 h-5 text-charcoal-400" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-16 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-charcoal-900 border-t border-charcoal-800 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center space-y-1 px-3 py-2 min-w-[44px] min-h-[44px] transition-colors ${
                  isActive
                    ? 'text-gold-500'
                    : 'text-charcoal-400 hover:text-charcoal-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
