import { Calculator, Clock3, Gem, SearchCheck, ShoppingBag, Wrench } from 'lucide-react';

const faqs = [
  {
    question: '¿Puedo llevar mi propio oro?',
    answer: 'Sí. Revisamos peso, pureza y estado del material para definir si se usa en la pieza, si requiere refinación o si conviene tomarlo como parte de pago.',
    icon: Gem,
  },
  {
    question: '¿Cuánto tarda una pieza personalizada?',
    answer: 'Depende del diseño, los materiales y la carga del taller. En la cotización se define una fecha estimada y el pedido queda disponible para seguimiento.',
    icon: Clock3,
  },
  {
    question: '¿Cómo se calcula el precio?',
    answer: 'El valor se compone de metal, liga, piedras si aplica, mano de obra y servicios adicionales. Cuando el cliente aporta material, se descuenta según el metal puro equivalente.',
    icon: Calculator,
  },
  {
    question: '¿Hacen reparaciones o ajustes?',
    answer: 'Sí. Trabajamos ajustes de talla, reparaciones, mantenimiento, limpieza, engaste y revisión de piezas en oro o plata.',
    icon: Wrench,
  },
  {
    question: '¿Puedo ver el avance de mi pedido?',
    answer: 'Sí. Con el código del pedido y los últimos dígitos del teléfono puedes consultar el estado desde la página de seguimiento.',
    icon: SearchCheck,
  },
  {
    question: '¿También venden piezas listas?',
    answer: 'Sí. El catálogo muestra piezas disponibles o de referencia. Si una pieza inspira un cambio, podemos cotizar una versión personalizada.',
    icon: ShoppingBag,
  },
];

export function FaqSection() {
  return (
    <section className="px-5 py-24 sm:px-8 md:px-12 md:py-32 lg:px-16">
      <div className="mx-auto grid max-w-[1200px] gap-8 md:gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <div className="section-rule mb-3 sm:mb-4">
            <span className="text-[10px] uppercase tracking-[0.2em] text-cream-200/30 font-sans-custom">
              Preguntas frecuentes
            </span>
          </div>
          <h2
            className="max-w-xl font-display leading-[1.05] text-cream-100"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)' }}
          >
            Antes de <br />
            <span className="text-gold-400 font-semibold">encargar</span> una joya
          </h2>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-cream-200/40 font-sans-custom sm:mt-4 sm:text-sm">
            Algunas respuestas para entender tiempos, materiales, cotizaciones y seguimiento antes de iniciar un pedido.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[1.5rem] border border-cream-200/[0.08] bg-[#10100e]/85 p-3 md:p-4">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.52), transparent)' }}
          />
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full"
            style={{ background: 'rgba(212,175,55,0.075)', filter: 'blur(70px)' }}
          />

          <div className="relative flex items-center justify-between border-b border-cream-200/[0.06] px-2 pb-4 md:px-3">
            <span className="text-[10px] uppercase tracking-[0.18em] text-gold-400/55 font-sans-custom">
              Respuestas rápidas
            </span>
            <span className="font-mono text-[10px] text-cream-200/20">
              06
            </span>
          </div>

          {faqs.map((faq, index) => {
            const Icon = faq.icon;

            return (
              <details
                key={faq.question}
                className="group relative border-b border-cream-200/[0.055] px-2 py-5 transition-colors last:border-b-0 open:bg-cream-200/[0.018] md:px-3"
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-left">
                  <span className="flex min-w-0 items-center gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cream-200/[0.07] bg-cream-200/[0.035] text-gold-400/62 transition-colors group-open:border-gold-400/28 group-open:bg-gold-400/[0.08] group-open:text-gold-400">
                      <Icon size={17} strokeWidth={1.5} />
                    </span>
                    <span>
                      <span className="mb-1 block font-mono text-[10px] text-cream-200/18">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="block font-display text-xl font-medium leading-tight text-cream-100/88 transition-colors group-open:text-cream-100 md:text-2xl">
                        {faq.question}
                      </span>
                    </span>
                  </span>
                  <span className="relative h-8 w-8 shrink-0 rounded-full border border-cream-200/10 text-cream-200/34 transition-colors group-open:border-gold-400/35 group-open:text-gold-400/85">
                    <span className="absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 -translate-y-1/2 bg-current" />
                    <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-current transition-transform group-open:rotate-90" />
                  </span>
                </summary>
                <p className="ml-14 mt-4 max-w-2xl text-sm leading-7 text-cream-200/48 font-sans-custom">
                  {faq.answer}
                </p>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}
