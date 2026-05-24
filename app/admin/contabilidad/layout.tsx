'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  Package,
  TrendingDown,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const TABS = [
  { key: 'dashboard',           label: 'Resumen',             href: '/admin/contabilidad',                       icon: LayoutDashboard },
  { key: 'facturacion',         label: 'Facturación',         href: '/admin/contabilidad/facturacion',           icon: Receipt },
  { key: 'pagos-trabajadores',  label: 'Pagos Trabajadores',  href: '/admin/contabilidad/pagos-trabajadores',    icon: Wallet },
  { key: 'inventario',          label: 'Inventario',          href: '/admin/contabilidad/inventario',            icon: Package },
  { key: 'gastos',              label: 'Gastos',              href: '/admin/contabilidad/gastos',                icon: TrendingDown },
  { key: 'reportes',            label: 'Reportes',            href: '/admin/contabilidad/reportes',              icon: BarChart3 },
] as const;

export default function ContabilidadLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && user && user.role !== 'admin') {
      router.push('/admin');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>Finanzas</h1>
        <p className="text-sm mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.32)' }}>Dinero, cartera, egresos y flujo de caja</p>
      </div>

      {/* Sub-tabs */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <nav className="flex gap-1 overflow-x-auto -mb-px">
          {TABS.map((tab) => {
            const isActive =
              tab.href === '/admin/contabilidad'
                ? pathname === '/admin/contabilidad'
                : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.key}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors font-sans-custom ${
                  isActive
                    ? 'border-gold-500'
                    : 'border-transparent'
                }`}
                style={{
                  color: isActive ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.4)'
                }}
                onMouseEnter={e => !isActive && ((e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.6)')}
                onMouseLeave={e => !isActive && ((e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.4)')}
              >
                <tab.icon size={15} />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}
