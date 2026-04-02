import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductBySlug, Product } from '@/lib/api-client/catalog';

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const product = await getProductBySlug(params.slug);
    return {
      title: product.seoTitle || `${product.name} | H2 Oro`,
      description: product.seoDesc || product.description || `${product.name} — Joyería artesanal H2 Oro`,
    };
  } catch {
    return { title: 'Producto no encontrado | H2 Oro' };
  }
}

function formatPrice(price: number | null, currency = 'COP'): string {
  if (!price) return '';
  return `$${Number(price).toLocaleString('es-CO')} ${currency}`;
}

export default async function ProductDetailPage({ params }: PageProps) {
  let product: Product;

  try {
    product = await getProductBySlug(params.slug);
  } catch {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <ol className="flex items-center space-x-2 text-sm text-gray-500">
          <li>
            <Link href="/" className="hover:text-gray-900">Inicio</Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/catalogo" className="hover:text-gray-900">Catálogo</Link>
          </li>
          <li>/</li>
          <li>
            <Link
              href={`/catalogo?categorySlug=${product.category.slug}`}
              className="hover:text-gray-900"
            >
              {product.category.name}
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900 font-medium">{product.name}</li>
        </ol>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Images */}
            <div className="bg-gray-100">
              {product.images.length > 0 ? (
                <div>
                  {/* Main image */}
                  <div className="aspect-square flex items-center justify-center bg-gray-200">
                    <span className="text-gray-400 text-sm">
                      {product.images[0].altText || product.name}
                    </span>
                  </div>
                  {/* Thumbnails */}
                  {product.images.length > 1 && (
                    <div className="flex gap-2 p-4">
                      {product.images.map((img, i) => (
                        <div
                          key={img.id}
                          className={`w-16 h-16 bg-gray-200 rounded border-2 flex items-center justify-center text-xs text-gray-400 ${i === 0 ? 'border-amber-500' : 'border-transparent'}`}
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-square flex items-center justify-center">
                  <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Product info */}
            <div className="p-8 lg:p-10">
              <p className="text-sm text-amber-600 uppercase tracking-wider font-medium">
                {product.category.name}
              </p>

              <h1 className="mt-2 text-3xl font-bold text-gray-900">
                {product.name}
              </h1>

              {product.material && (
                <p className="mt-2 text-gray-500">Material: {product.material}</p>
              )}

              {/* Price */}
              {product.basePriceCop && (
                <div className="mt-6">
                  <p className="text-3xl font-bold text-gray-900">
                    {formatPrice(product.basePriceCop)}
                  </p>
                  {product.basePriceUsd && (
                    <p className="text-sm text-gray-500 mt-1">
                      ≈ {formatPrice(product.basePriceUsd, 'USD')}
                    </p>
                  )}
                </div>
              )}

              {/* Description */}
              {product.description && (
                <div className="mt-6">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    Descripción
                  </h2>
                  <p className="mt-2 text-gray-600 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Variants */}
              {product.variants.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                    Variantes disponibles
                  </h2>
                  <div className="space-y-3">
                    {product.variants.map((variant) => (
                      <div
                        key={variant.id}
                        className="flex items-center justify-between border rounded-lg px-4 py-3 hover:border-amber-500 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{variant.name}</p>
                          {variant.sku && (
                            <p className="text-xs text-gray-400">SKU: {variant.sku}</p>
                          )}
                        </div>
                        {variant.priceCop && (
                          <p className="font-semibold text-gray-900">
                            {formatPrice(variant.priceCop)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="mt-8 space-y-3">
                <button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                  Consultar disponibilidad
                </button>
                <button className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors">
                  Solicitar cotización personalizada
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-8">
          <Link
            href="/catalogo"
            className="text-amber-600 hover:text-amber-700 text-sm font-medium"
          >
            ← Volver al catálogo
          </Link>
        </div>
      </div>
    </main>
  );
}
