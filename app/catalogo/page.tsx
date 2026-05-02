import { Metadata } from 'next';
import Link from 'next/link';
import { getProducts, getCategories } from '@/lib/api-client/catalog';
import { Header } from '@/components/layout/header';
import { WhatsAppButton } from '@/components/whatsapp-button';

export const metadata: Metadata = {
  title: 'Catálogo | H2 Oro',
  description: 'Explora nuestra colección de joyería artesanal. Anillos, collares, pulseras, aretes y más.',
};

interface PageProps {
  searchParams: {
    page?: string;
    categorySlug?: string;
    material?: string;
    minPrice?: string;
    maxPrice?: string;
    search?: string;
    sort?: string;
  };
}

export default async function CatalogoPage({ searchParams }: PageProps) {
  const params: Record<string, string> = {};
  if (searchParams.page) params.page = searchParams.page;
  if (searchParams.categorySlug) params.categorySlug = searchParams.categorySlug;
  if (searchParams.material) params.material = searchParams.material;
  if (searchParams.minPrice) params.minPrice = searchParams.minPrice;
  if (searchParams.maxPrice) params.maxPrice = searchParams.maxPrice;
  if (searchParams.search) params.search = searchParams.search;
  if (searchParams.sort) params.sort = searchParams.sort;

  let products: Awaited<ReturnType<typeof getProducts>>;
  let categories: Awaited<ReturnType<typeof getCategories>>;

  try {
    [products, categories] = await Promise.all([
      getProducts(params),
      getCategories(),
    ]);
  } catch {
    products = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    categories = [];
  }

  const currentPage = parseInt(searchParams.page || '1', 10);

  return (
    <>
    <Header />
    <main className="min-h-screen" style={{ background: '#0A0A0A' }}>
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[60vw] h-[35vh] pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.05) 0%, transparent 70%)', filter: 'blur(60px)' }}
      />

      {/* Page header */}
      <section className="relative z-10 section-padding pt-28 pb-12" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-[90rem] mx-auto">
          <span className="text-[10px] uppercase tracking-[0.22em] block mb-4 font-sans-custom" style={{ color: 'rgba(212,175,55,0.6)' }}>
            Colección
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>
            Catálogo
          </h1>
          <p className="mt-3 text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
            Explora nuestra colección de joyería artesanal
          </p>
        </div>
      </section>

      <div className="relative z-10 section-padding py-10">
        <div className="max-w-[90rem] mx-auto flex flex-col lg:flex-row gap-8">

          {/* Sidebar — Filters */}
          <aside className="w-full lg:w-56 shrink-0">
            <div className="rounded-2xl p-5 space-y-7 sticky top-24" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {/* Search */}
              <div>
                <h3 className="text-[9px] uppercase tracking-[0.2em] font-semibold mb-3 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                  Buscar
                </h3>
                <form>
                  <input
                    type="text"
                    name="search"
                    defaultValue={searchParams.search || ''}
                    placeholder="Buscar productos..."
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none font-sans-custom"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      color: 'rgba(242,240,237,0.8)',
                    }}
                  />
                </form>
              </div>

              {/* Categories */}
              <div>
                <h3 className="text-[9px] uppercase tracking-[0.2em] font-semibold mb-3 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                  Categorías
                </h3>
                <ul className="space-y-1">
                  <li>
                    <Link
                      href="/catalogo"
                      className="block text-sm py-1 transition-colors duration-200 font-sans-custom"
                      style={{ color: !searchParams.categorySlug ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.45)' }}
                    >
                      Todas
                    </Link>
                  </li>
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <Link
                        href={`/catalogo?categorySlug=${cat.slug}`}
                        className="flex items-center justify-between text-sm py-1 transition-colors duration-200 font-sans-custom"
                        style={{ color: searchParams.categorySlug === cat.slug ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.45)' }}
                      >
                        <span>{cat.name}</span>
                        <span className="text-[10px]" style={{ color: 'rgba(242,240,237,0.2)' }}>
                          {cat._count.products}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sort */}
              <div>
                <h3 className="text-[9px] uppercase tracking-[0.2em] font-semibold mb-3 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                  Ordenar por
                </h3>
                <ul className="space-y-1">
                  {[
                    { value: 'newest', label: 'Más recientes' },
                    { value: 'price_asc', label: 'Precio ↑' },
                    { value: 'price_desc', label: 'Precio ↓' },
                    { value: 'name', label: 'Nombre' },
                  ].map((option) => (
                    <li key={option.value}>
                      <Link
                        href={`/catalogo?${new URLSearchParams({ ...params, sort: option.value }).toString()}`}
                        className="block text-sm py-1 transition-colors duration-200 font-sans-custom"
                        style={{ color: searchParams.sort === option.value ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.45)' }}
                      >
                        {option.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1">
            {/* Results count */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                {products.total} producto{products.total !== 1 ? 's' : ''}
              </p>
            </div>

            {products.data.length === 0 ? (
              <div className="text-center py-20 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>No se encontraron productos</p>
                <Link
                  href="/catalogo"
                  className="mt-4 inline-block text-xs uppercase tracking-[0.12em] transition-colors font-sans-custom"
                  style={{ color: 'rgba(212,175,55,0.7)' }}
                >
                  Ver todos los productos
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {products.data.map((product) => (
                  <Link
                    key={product.id}
                    href={`/catalogo/${product.slug}`}
                    className="group block overflow-hidden rounded-2xl transition-all duration-300"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {/* Image area */}
                    <div
                      className="aspect-square relative overflow-hidden"
                      style={{ background: 'linear-gradient(145deg, #1A1A1A, #0D0D0D)' }}
                    >
                      {product.images.length > 0 ? (
                        <div
                          className="w-full h-full flex items-center justify-center text-xs font-sans-custom"
                          style={{ color: 'rgba(242,240,237,0.2)' }}
                        >
                          {product.images[0].altText || product.name}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={0.8} viewBox="0 0 24 24" style={{ color: 'rgba(242,240,237,0.1)' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {/* Top accent line */}
                      <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)' }} />
                    </div>

                    <div className="p-4">
                      <p className="text-[9px] uppercase tracking-[0.18em] mb-1 font-sans-custom" style={{ color: 'rgba(212,175,55,0.6)' }}>
                        {product.category.name}
                      </p>
                      <h2 className="font-display text-sm font-medium transition-colors duration-300" style={{ color: 'rgba(242,240,237,0.85)' }}>
                        {product.name}
                      </h2>
                      {product.material && (
                        <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>{product.material}</p>
                      )}
                      {product.basePriceCop && (
                        <p className="mt-2.5 font-display text-base font-semibold" style={{ color: 'rgba(212,175,55,0.9)' }}>
                          ${Number(product.basePriceCop).toLocaleString('es-CO')}
                          <span className="text-[10px] font-normal ml-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>COP</span>
                        </p>
                      )}
                      {product.variants.length > 0 && (
                        <p className="text-[10px] mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>
                          {product.variants.length} variante{product.variants.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {products.totalPages > 1 && (
              <nav className="flex justify-center mt-10 gap-2">
                {currentPage > 1 && (
                  <Link
                    href={`/catalogo?${new URLSearchParams({ ...params, page: String(currentPage - 1) }).toString()}`}
                    className="px-4 py-2 text-xs rounded-xl transition-all font-sans-custom"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.6)' }}
                  >
                    Anterior
                  </Link>
                )}
                {Array.from({ length: products.totalPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={`/catalogo?${new URLSearchParams({ ...params, page: String(p) }).toString()}`}
                    className="w-9 h-9 flex items-center justify-center text-xs rounded-xl transition-all font-sans-custom"
                    style={p === currentPage
                      ? { background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400', fontWeight: 600 }
                      : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.5)' }}
                  >
                    {p}
                  </Link>
                ))}
                {currentPage < products.totalPages && (
                  <Link
                    href={`/catalogo?${new URLSearchParams({ ...params, page: String(currentPage + 1) }).toString()}`}
                    className="px-4 py-2 text-xs rounded-xl transition-all font-sans-custom"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.6)' }}
                  >
                    Siguiente
                  </Link>
                )}
              </nav>
            )}
          </div>
        </div>
      </div>
    </main>
    <WhatsAppButton />
    </>
  );
}
