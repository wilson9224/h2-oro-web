import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Gem, MessageCircle, PackageCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { getProductBySlug, Product } from '@/lib/api-client/catalog';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { WhatsAppButton } from '@/components/whatsapp-button';

interface PageProps {
  params: { slug: string };
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const product = await getProductBySlug(params.slug);
    return {
      title: product.seoTitle || `${product.name} | H2 Oro`,
      description: product.seoDesc || product.description || `${product.name} - Joyería artesanal H2 Oro`,
    };
  } catch {
    return { title: 'Producto no encontrado | H2 Oro' };
  }
}

function formatPrice(price: number | null, currency = 'COP'): string {
  if (!price) return '';
  return `$${Number(price).toLocaleString('es-CO')} ${currency}`;
}

function getWhatsAppHref(product: Product) {
  const message = encodeURIComponent(
    `Hola, quiero consultar disponibilidad de ${product.name}${product.category?.name ? ` de la categoría ${product.category.name}` : ''}.`
  );
  return `https://wa.me/573196518919?text=${message}`;
}

export default async function ProductDetailPage({ params }: PageProps) {
  let product: Product;

  try {
    product = await getProductBySlug(params.slug);
  } catch {
    notFound();
  }

  const mainImage = product.images[0];
  const whatsappHref = getWhatsAppHref(product);

  return (
    <>
      <Header />
      <main className="min-h-screen overflow-hidden bg-[#0A0A0A]">
        <div
          className="fixed left-1/2 top-0 z-0 h-[42vh] w-[70vw] -translate-x-1/2 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.025) 35%, transparent 72%)', filter: 'blur(70px)' }}
        />

        <section className="relative z-10 section-padding pt-28 pb-8">
          <div className="mx-auto max-w-[90rem]">
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream-200/40 hover:text-gold-400"
            >
              <ArrowLeft size={14} />
              Volver al catálogo
            </Link>

            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] lg:items-start">
              <div className="space-y-4">
                <div className="group relative overflow-hidden rounded-[1.75rem] border border-cream-200/[0.08] bg-cream-200/[0.03]">
                  <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-gold-400/45 to-transparent" />
                  <div className="relative aspect-[4/5] min-h-[360px] overflow-hidden bg-[#111] sm:aspect-square lg:aspect-[5/6]">
                    {mainImage ? (
                      <Image
                        src={mainImage.publicUrl}
                        alt={mainImage.altText || product.name}
                        fill
                        priority
                        sizes="(min-width: 1024px) 54vw, 100vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.025]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.12),rgba(255,255,255,0.03)_38%,rgba(0,0,0,0)_70%)]">
                        <Gem size={72} strokeWidth={1} className="text-gold-400/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/65 via-transparent to-transparent" />
                    <div className="absolute bottom-5 left-5 rounded-full border border-cream-200/10 bg-[#0A0A0A]/65 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cream-200/65 backdrop-blur-xl">
                      {product.category.name}
                    </div>
                  </div>
                </div>

                {product.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                    {product.images.slice(0, 6).map((img, i) => (
                      <div
                        key={img.id}
                        className={`relative aspect-square overflow-hidden rounded-2xl border bg-cream-200/[0.03] ${i === 0 ? 'border-gold-400/55' : 'border-cream-200/[0.08]'}`}
                      >
                        <Image
                          src={img.publicUrl}
                          alt={img.altText || `${product.name} ${i + 1}`}
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <aside className="lg:sticky lg:top-24">
                <div className="rounded-[1.75rem] border border-cream-200/[0.08] bg-cream-200/[0.035] p-6 backdrop-blur-xl sm:p-8 lg:p-10">
                  <div className="section-rule text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-400/70">
                    Pieza de colección
                  </div>

                  <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] text-cream-100 text-balance md:text-5xl">
                    {product.name}
                  </h1>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {product.material && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-cream-200/[0.08] bg-cream-200/[0.04] px-3 py-1.5 text-xs text-cream-200/65">
                        <Sparkles size={13} className="text-gold-400/80" />
                        {product.material}
                      </span>
                    )}
                    <Link
                      href={product.category.slug ? `/catalogo?categorySlug=${product.category.slug}` : '/catalogo'}
                      className="inline-flex items-center gap-2 rounded-full border border-cream-200/[0.08] bg-cream-200/[0.04] px-3 py-1.5 text-xs text-cream-200/65 hover:border-gold-400/35 hover:text-gold-300"
                    >
                      <Gem size={13} className="text-gold-400/70" />
                      {product.category.name}
                    </Link>
                  </div>

                  {product.basePriceCop ? (
                    <div className="mt-8 border-y border-cream-200/[0.07] py-6">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cream-200/30">
                        Precio de referencia
                      </p>
                      <p className="mt-2 font-display text-3xl font-semibold text-gold-400">
                        {formatPrice(product.basePriceCop)}
                      </p>
                      {product.basePriceUsd && (
                        <p className="mt-1 text-xs text-cream-200/30">
                          Referencia internacional: {formatPrice(product.basePriceUsd, 'USD')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-8 border-y border-cream-200/[0.07] py-6">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cream-200/30">
                        Precio
                      </p>
                      <p className="mt-2 text-sm text-cream-200/60">
                        Disponible bajo cotización.
                      </p>
                    </div>
                  )}

                  {product.description && (
                    <div className="mt-7">
                      <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cream-200/35">
                        Descripción
                      </h2>
                      <p className="mt-3 max-w-xl text-sm leading-7 text-cream-200/62">
                        {product.description}
                      </p>
                    </div>
                  )}

                  {product.variants.length > 0 && (
                    <div className="mt-8">
                      <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cream-200/35">
                        Variantes disponibles
                      </h2>
                      <div className="mt-3 space-y-2">
                        {product.variants.map((variant) => (
                          <div
                            key={variant.id}
                            className="flex items-center justify-between gap-4 rounded-2xl border border-cream-200/[0.07] bg-[#0F0F0F]/70 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-cream-100/85">{variant.name}</p>
                              {variant.sku && (
                                <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-cream-200/25">
                                  SKU {variant.sku}
                                </p>
                              )}
                            </div>
                            {variant.priceCop && (
                              <p className="shrink-0 text-sm font-semibold text-gold-400/90">
                                {formatPrice(variant.priceCop)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-pill justify-center px-5"
                    >
                      <MessageCircle size={16} />
                      Consultar
                    </a>
                    <Link
                      href="/catalogo"
                      className="btn-pill-outline justify-center px-5"
                    >
                      Ver más piezas
                      <ArrowUpRight size={15} />
                    </Link>
                  </div>

                  <div className="mt-8 grid gap-3 border-t border-cream-200/[0.07] pt-6 sm:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <ShieldCheck size={17} className="mt-0.5 text-gold-400/70" />
                      <div>
                        <p className="text-sm font-medium text-cream-100/80">Trabajo artesanal</p>
                        <p className="mt-1 text-xs leading-5 text-cream-200/32">Piezas revisadas por el taller antes de entrega.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <PackageCheck size={17} className="mt-0.5 text-gold-400/70" />
                      <div>
                        <p className="text-sm font-medium text-cream-100/80">Pedido acompañado</p>
                        <p className="mt-1 text-xs leading-5 text-cream-200/32">El equipo confirma disponibilidad y tiempos.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <Footer />
        <WhatsAppButton />
      </main>
    </>
  );
}
