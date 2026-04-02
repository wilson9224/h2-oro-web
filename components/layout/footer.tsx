import Link from 'next/link';

const navLinks = [
  { href: '/catalogo', label: 'Colección' },
  { href: '/proceso', label: 'Proceso' },
  { href: '/seguimiento', label: 'Mi Pedido' },
  { href: '/auth/login', label: 'Mi Cuenta' },
];

const legalLinks = [
  { href: '#', label: 'Privacidad' },
  { href: '#', label: 'Términos' },
];

export function Footer() {
  return (
    <footer className="border-t border-cream-200/[0.06]">
      <div className="section-padding py-16 md:py-24">
        <div className="max-w-[90rem] mx-auto">
          {/* Top — brand + nav */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-12 mb-20">
            {/* Brand */}
            <div className="max-w-xs">
              <Link href="/" className="inline-block mb-5">
                <span className="font-serif text-xl tracking-tight">
                  <span className="text-gold-400 font-semibold">H2</span>
                  <span className="text-cream-200 font-light"> Oro</span>
                </span>
              </Link>
              <p className="text-sm text-cream-200/30 leading-relaxed font-sans">
                Joyería artesanal colombiana. Cada pieza
                es una obra de arte forjada con pasión.
              </p>
            </div>

            {/* Nav links — horizontal */}
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="link-hover text-xs uppercase tracking-[0.12em] font-sans"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-cream-200/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-label text-cream-200/20 font-sans">
              © {new Date().getFullYear()} H2 Oro — Bogotá, Colombia
            </span>
            <div className="flex gap-6">
              {legalLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-label text-cream-200/15 hover:text-cream-200/40 transition-colors duration-500 font-sans"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
