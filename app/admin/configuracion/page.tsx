'use client';

import Link from 'next/link';
import {
  Palette,
  Globe,
  Bell,
  Shield,
  MessageCircle,
  DollarSign,
  Users,
  BookOpen,
  BarChart3,
  ChevronRight,
  Clock,
} from 'lucide-react';

const ACTIVE_SETTINGS = [
  {
    icon: MessageCircle,
    title: 'Mensajería WhatsApp',
    desc: 'Audita envíos, revisa fallos y ajusta plantillas transaccionales.',
    href: '/admin/mensajes',
    status: 'Activo',
  },
  {
    icon: DollarSign,
    title: 'Precios y tarifas',
    desc: 'Configura metales, servicios de cobro y pagos a trabajadores.',
    href: '/admin/precios',
    status: 'Admin',
  },
  {
    icon: Users,
    title: 'Usuarios y roles',
    desc: 'Edita perfiles, estados de acceso y roles del equipo.',
    href: '/admin/usuarios',
    status: 'Activo',
  },
  {
    icon: BookOpen,
    title: 'Finanzas',
    desc: 'Gestiona facturación, inventario, gastos y pagos operativos.',
    href: '/admin/contabilidad',
    status: 'Admin',
  },
  {
    icon: BarChart3,
    title: 'Reportes',
    desc: 'Exporta datos de pedidos, pagos, producción y asignaciones.',
    href: '/admin/reportes',
    status: 'CSV',
  },
];

const PENDING_SETTINGS = [
  { icon: Palette, title: 'Apariencia', desc: 'Logo, colores del panel y preferencias visuales.' },
  { icon: Globe, title: 'Idioma y moneda', desc: 'Región, moneda principal, formatos y textos del sistema.' },
  { icon: Shield, title: 'Seguridad avanzada', desc: 'Permisos granulares, auditoría de acciones y reglas de acceso.' },
  { icon: Bell, title: 'Centro de alertas', desc: 'Reglas para vencimientos, bajo stock, pagos y mensajes fallidos.' },
];

export default function ConfigPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>Configuración</h1>
          <p className="text-sm mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
            Centro de administración del sistema y accesos a módulos de control.
          </p>
        </div>
        <div className="rounded-xl px-3 py-2 text-xs font-sans-custom" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.16)', color: 'rgba(212,175,55,0.78)' }}>
          Panel de admin
        </div>
      </div>

      <section className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.42)' }}>
            Controles disponibles
          </h2>
          <p className="text-[11px] mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>
            Accesos directos a configuraciones que ya tienen pantalla funcional.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-1 p-1">
          {ACTIVE_SETTINGS.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-xl p-4 transition-colors hover:bg-white/[0.025]"
              style={{ border: '1px solid rgba(255,255,255,0.055)' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.14)' }}>
                  <item.icon size={17} style={{ color: 'rgba(212,175,55,0.86)' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.84)' }}>{item.title}</h3>
                    <span className="rounded-md px-1.5 py-0.5 text-[10px] font-sans-custom" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.36)' }}>
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed font-sans-custom" style={{ color: 'rgba(242,240,237,0.36)' }}>{item.desc}</p>
                </div>
                <ChevronRight size={15} className="mt-1 transition-transform group-hover:translate-x-0.5" style={{ color: 'rgba(242,240,237,0.2)' }} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
            Próximas configuraciones
          </h2>
          <span className="text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>
            Recomendadas para completar el panel
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PENDING_SETTINGS.map((item) => (
            <div
              key={item.title}
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.055)' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.045)' }}>
                  <item.icon size={16} style={{ color: 'rgba(242,240,237,0.3)' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.72)' }}>{item.title}</h3>
                    <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-sans-custom" style={{ background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.58)' }}>
                      <Clock size={10} /> Pendiente
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed font-sans-custom" style={{ color: 'rgba(242,240,237,0.32)' }}>{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
