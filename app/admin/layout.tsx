'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Package,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Pedidos', href: '/admin/pedidos', icon: ShoppingBag },
  { label: 'Usuarios', href: '/admin/usuarios', icon: Users },
  { label: 'Catálogo', href: '/admin/catalogo', icon: Package },
  { label: 'CMS', href: '/admin/cms', icon: FileText },
  { label: 'Reportes', href: '/admin/reportes', icon: BarChart3 },
  { label: 'Configuración', href: '/admin/configuracion', icon: Settings },
];

const ALLOWED_ROLES = ['admin', 'manager', 'jeweler', 'designer'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
    if (!loading && user && !ALLOWED_ROLES.includes(user.role)) {
      router.push('/mi-cuenta');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !ALLOWED_ROLES.includes(user.role)) return null;

  const roleBadge: Record<string, { label: string; color: string }> = {
    admin: { label: 'Admin', color: 'bg-gold-500/20 text-gold-400' },
    manager: { label: 'Gerente', color: 'bg-blue-500/20 text-blue-400' },
    jeweler: { label: 'Joyero', color: 'bg-emerald-500/20 text-emerald-400' },
    designer: { label: 'Diseñador', color: 'bg-purple-500/20 text-purple-400' },
  };

  const badge = roleBadge[user.role] || { label: user.role, color: 'bg-charcoal-700 text-charcoal-300' };

  return (
    <div className="min-h-screen bg-charcoal-900 flex">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-charcoal-800 border-r border-white/5">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/5">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="font-serif text-xl font-semibold tracking-tight">
              <span className="text-gold-400">H2</span>
              <span className="text-cream-200"> Oro</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest text-charcoal-500 ml-auto">Panel</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 group ${
                  isActive
                    ? 'bg-gold-500/10 text-gold-400'
                    : 'text-charcoal-300 hover:bg-white/5 hover:text-cream-200'
                }`}
              >
                <item.icon size={18} className={isActive ? 'text-gold-400' : 'text-charcoal-500 group-hover:text-charcoal-300'} />
                {item.label}
                {isActive && <ChevronRight size={14} className="ml-auto text-gold-500/50" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 text-xs font-semibold">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-cream-200 truncate">{user.firstName} {user.lastName}</p>
              <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${badge.color}`}>
                {badge.label}
              </span>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-xs text-charcoal-400 hover:text-red-400 transition-colors w-full"
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-72 bg-charcoal-800 z-50 flex flex-col">
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
              <span className="font-serif text-xl font-semibold tracking-tight">
                <span className="text-gold-400">H2</span>
                <span className="text-cream-200"> Oro</span>
              </span>
              <button onClick={() => setSidebarOpen(false)} className="text-charcoal-400">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all ${
                      isActive ? 'bg-gold-500/10 text-gold-400' : 'text-charcoal-300 hover:bg-white/5'
                    }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-4 py-4 border-t border-white/5">
              <button onClick={signOut} className="flex items-center gap-2 text-xs text-charcoal-400 hover:text-red-400 transition-colors">
                <LogOut size={14} />
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64 flex-1 flex flex-col min-h-screen">
        {/* Top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 bg-charcoal-800/80 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="text-charcoal-300">
            <Menu size={22} />
          </button>
          <span className="font-serif text-lg font-semibold">
            <span className="text-gold-400">H2</span>
            <span className="text-cream-200"> Oro</span>
          </span>
          <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 text-xs font-semibold">
            {user.firstName[0]}{user.lastName[0]}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
