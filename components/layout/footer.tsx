import Link from 'next/link';
import { MapPin } from 'lucide-react';

const navigationLinks = [
  { href: '/seguimiento', label: 'Mi pedido' },
  { href: '/auth/login', label: 'Ingresar' },
  { href: '/catalogo', label: 'Catálogo' },
  { href: '/servicios', label: 'Servicios' },
];

const serviceLinks = [
  { href: '/servicios', label: 'Joyería personalizada' },
  { href: '/servicios', label: 'Reparación y ajuste' },
  { href: '/servicios', label: 'Compra y venta de oro' },
  { href: '/servicios', label: 'Piedras y engaste' },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-cream-200/[0.06] bg-[#070707]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.38), transparent)' }}
      />
      <div
        className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full"
        style={{ background: 'rgba(212,175,55,0.045)', filter: 'blur(70px)' }}
      />

      <div className="section-padding py-16 md:py-24">
        <div className="mx-auto max-w-[90rem]">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr_0.85fr]">
            <div>
              <Link href="/" className="inline-flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold tracking-tight text-gold-400 md:text-6xl">H2</span>
                <span className="font-display text-4xl font-light tracking-tight text-cream-200 md:text-6xl">Oro</span>
              </Link>
              <p className="mt-6 max-w-md text-sm leading-7 text-cream-200/42 font-sans-custom">
                Taller de joyería en Bogotá. Diseñamos, fabricamos, reparamos y acompañamos pedidos en oro y plata con seguimiento visible para cada cliente.
              </p>
            </div>

            <nav className="grid grid-cols-2 gap-8 sm:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-400/58 font-sans-custom">
                  Accesos
                </p>
                <div className="mt-5 space-y-3">
                  {navigationLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block text-sm text-cream-200/46 transition-colors duration-300 hover:text-cream-100 font-sans-custom"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-400/58 font-sans-custom">
                  Taller
                </p>
                <div className="mt-5 space-y-3">
                  {serviceLinks.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="block text-sm text-cream-200/46 transition-colors duration-300 hover:text-cream-100 font-sans-custom"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </nav>

            <div className="rounded-[1.35rem] border border-cream-200/[0.07] bg-cream-200/[0.025] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-400/58 font-sans-custom">
                Contacto
              </p>
              <div className="mt-5 space-y-5">
                <div className="flex gap-3">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-gold-400/65" />
                  <div>
                    <p className="text-sm font-medium text-cream-100/78 font-sans-custom">Bogotá, Colombia</p>
                    <p className="mt-1 text-xs leading-5 text-cream-200/32 font-sans-custom">Atención por WhatsApp desde el botón flotante y pedidos coordinados con el taller.</p>
                  </div>
                </div>

                <div className="border-t border-cream-200/[0.06] pt-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-cream-200/25 font-sans-custom">Horario</p>
                  <p className="mt-2 text-sm text-cream-200/58 font-sans-custom">Lunes a sábado, según agenda de taller.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-4 border-t border-cream-200/[0.06] pt-7 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[11px] text-cream-200/25 font-sans-custom">
              © {new Date().getFullYear()} H2 Oro. Bogotá, Colombia.
            </span>
            <span className="text-[11px] text-cream-200/18 font-sans-custom">
              Privacidad y términos disponibles bajo solicitud.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
