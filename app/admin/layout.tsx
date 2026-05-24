'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Package,
  BarChart3,
  Settings,
  DollarSign,
  Calculator,
  LogOut,
  Menu,
  X,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const adminNavItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Pedidos', href: '/admin/pedidos', icon: ShoppingBag },
  { label: 'Usuarios', href: '/admin/usuarios', icon: Users },
  { label: 'Catálogo', href: '/admin/catalogo', icon: Package },
  { label: 'Reportes', href: '/admin/reportes', icon: BarChart3 },
  { label: 'Cotización', href: '/admin/cotizacion', icon: Calculator, roles: ['admin', 'manager'] },
  { label: 'Precios', href: '/admin/precios', icon: DollarSign, adminOnly: true },
  { label: 'Finanzas', href: '/admin/contabilidad', icon: BookOpen, adminOnly: true },
  { label: 'Configuración', href: '/admin/configuracion', icon: Settings },
];

const managerNavItems = [
  { label: 'Operación', href: '/admin', icon: LayoutDashboard },
  { label: 'Pedidos', href: '/admin/pedidos', icon: ShoppingBag },
  { label: 'Cotizaciones', href: '/admin/cotizacion', icon: Calculator },
  { label: 'Clientes', href: '/admin/usuarios', icon: Users },
  { label: 'Catálogo', href: '/admin/catalogo', icon: Package },
  { label: 'Reportes', href: '/admin/reportes', icon: BarChart3 },
];

const ALLOWED_ROLES = ['admin', 'manager'];

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgba(8,8,8,1)' }}>
        <div className="animate-spin h-8 w-8 border-2 rounded-full" style={{ borderColor: 'rgba(212,175,55,0.3)', borderTopColor: 'rgba(212,175,55,0.9)' }} />
      </div>
    );
  }

  if (!user || !ALLOWED_ROLES.includes(user.role)) return null;

  const roleBadge: Record<string, { label: string; color: string }> = {
    admin: { label: 'Admin', color: 'rgba(212,175,55,0.2)' },
    manager: { label: 'Gerente', color: 'rgba(59,130,246,0.2)' },
    jeweler: { label: 'Joyero', color: 'rgba(16,185,129,0.2)' },
    designer: { label: 'Diseñador', color: 'rgba(168,85,247,0.2)' },
  };

  const badge = roleBadge[user.role] || { label: user.role, color: 'rgba(255,255,255,0.04)' };
  const isManager = user.role === 'manager';
  const navItems = isManager
    ? managerNavItems
    : adminNavItems.filter((item) => {
      if ('adminOnly' in item && item.adminOnly && user.role !== 'admin') return false;
      if ('roles' in item && item.roles && !item.roles.includes(user.role)) return false;
      return true;
    });
  const workspaceLabel = isManager ? 'Operación' : 'Panel';

  return (
    <div className="min-h-screen flex" style={{ background: 'rgba(8,8,8,1)' }}>
      {/* Sidebar - desktop - improved */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0" style={{ background: 'rgba(8,8,8,1)', borderRight: '1px solid rgba(242,240,237,0.06)' }}>
        {/* Logo */}
        <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(242,240,237,0.06)' }}>
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight font-sans-custom">
              <span style={{ color: 'rgba(212,175,55,0.9)' }}>H2</span>
              <span style={{ color: 'rgba(242,240,237,0.8)' }}> Oro</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest ml-auto font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>{workspaceLabel}</span>
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group font-sans-custom"
                style={{
                  background: isActive ? 'rgba(212,175,55,0.1)' : 'transparent',
                  color: isActive ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.6)'
                }}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} style={{ color: isActive ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.4)' }} />
                {item.label}
                {isActive && <ChevronRight size={14} className="ml-auto" style={{ color: 'rgba(212,175,55,0.5)' }} />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-cream-200/[0.06]" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 mb-3 p-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: 'rgba(212,175,55,0.9)' }}>
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{user.firstName} {user.lastName}</p>
              <span className="inline-block text-[10px] px-1.5 py-0.5 rounded font-sans-custom" style={{ background: badge.color, border: '1px solid rgba(212,175,55,0.15)', color: 'rgba(242,240,237,0.72)' }}>
                {badge.label}
              </span>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-xs w-full px-2 py-2 rounded-lg transition-colors font-sans-custom"
            style={{ color: 'rgba(242,240,237,0.4)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(248,113,113,0.8)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(242,240,237,0.4)'}
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay - improved */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 z-50 flex flex-col font-sans-custom" style={{ background: 'rgba(8,8,8,1)', borderRight: '1px solid rgba(242,240,237,0.06)' }}
            >
              <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(242,240,237,0.06)' }}>
                <span className="text-xl font-semibold tracking-tight font-sans-custom">
                  <span style={{ color: 'rgba(212,175,55,0.9)' }}>H2</span>
                  <span style={{ color: 'rgba(242,240,237,0.8)' }}> Oro</span>
                </span>
                <span className="text-[10px] uppercase tracking-widest ml-auto mr-3 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>{workspaceLabel}</span>
                <button onClick={() => setSidebarOpen(false)} className="transition-colors p-2 -mr-2" style={{ color: 'rgba(242,240,237,0.6)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.8)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.6)'}>
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 font-sans-custom ${
                        isActive 
                          ? '' 
                          : ''
                      }`}
                      style={{
                        background: isActive ? 'rgba(212,175,55,0.1)' : 'transparent',
                        color: isActive ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.6)'
                      }}
                    >
                      <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} style={{ color: isActive ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.4)' }} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: 'rgba(212,175,55,0.1)', color: 'rgba(212,175,55,0.9)' }}>
                    {user.firstName[0]}{user.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{user.firstName} {user.lastName}</p>
                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded font-sans-custom" style={{ background: badge.color, border: '1px solid rgba(212,175,55,0.15)', color: 'rgba(242,240,237,0.72)' }}>
                      {badge.label}
                    </span>
                  </div>
                </div>
                <button onClick={signOut} className="flex items-center gap-2 text-xs w-full px-3 py-2 transition-colors font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(248,113,113,0.8)'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(242,240,237,0.4)'}>
                  <LogOut size={14} />
                  Cerrar sesión
                </button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="lg:pl-64 flex-1 flex flex-col min-h-screen">
        {/* Top bar (mobile) - improved */}
        <header className="lg:hidden sticky top-0 z-30 px-4 py-3 flex items-center justify-between font-sans-custom" style={{ background: 'rgba(8,8,8,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(242,240,237,0.06)' }}>
          <button onClick={() => setSidebarOpen(true)} className="transition-colors p-2 -ml-2" style={{ color: 'rgba(242,240,237,0.6)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.8)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.6)'}>
            <Menu size={22} />
          </button>
          <span className="text-lg font-semibold font-sans-custom">
            <span style={{ color: 'rgba(212,175,55,0.9)' }}>H2</span>
            <span style={{ color: 'rgba(242,240,237,0.8)' }}> Oro</span>
          </span>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: 'rgba(212,175,55,0.9)' }}>
            {user.firstName[0]}{user.lastName[0]}
          </div>
        </header>

        {/* Page content - better spacing */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
