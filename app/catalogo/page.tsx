import { Metadata } from 'next';
import Link from 'next/link';
import { getProducts, getCategories } from '@/lib/api-client/catalog';

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
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Catálogo</h1>
          <p className="mt-2 text-gray-600">
            Explora nuestra colección de joyería artesanal
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar — Filters */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              {/* Search */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                  Buscar
                </h3>
                <form>
                  <input
                    type="text"
                    name="search"
                    defaultValue={searchParams.search || ''}
                    placeholder="Buscar productos..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </form>
              </div>

              {/* Categories */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                  Categorías
                </h3>
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/catalogo"
                      className={`text-sm ${!searchParams.categorySlug ? 'text-amber-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Todas
                    </Link>
                  </li>
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <Link
                        href={`/catalogo?categorySlug=${cat.slug}`}
                        className={`text-sm ${searchParams.categorySlug === cat.slug ? 'text-amber-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                      >
                        {cat.name}
                        <span className="text-gray-400 ml-1">({cat._count.products})</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sort */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                  Ordenar por
                </h3>
                <ul className="space-y-2">
                  {[
                    { value: 'newest', label: 'Más recientes' },
                    { value: 'price_asc', label: 'Precio: menor a mayor' },
                    { value: 'price_desc', label: 'Precio: mayor a menor' },
                    { value: 'name', label: 'Nombre' },
                  ].map((option) => (
                    <li key={option.value}>
                      <Link
                        href={`/catalogo?${new URLSearchParams({ ...params, sort: option.value }).toString()}`}
                        className={`text-sm ${searchParams.sort === option.value ? 'text-amber-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
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
              <p className="text-sm text-gray-600">
                {products.total} producto{products.total !== 1 ? 's' : ''}
              </p>
            </div>

            {products.data.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg shadow">
                <p className="text-gray-500 text-lg">No se encontraron productos</p>
                <Link href="/catalogo" className="mt-4 inline-block text-amber-600 hover:underline">
                  Ver todos los productos
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.data.map((product) => (
                  <Link
                    key={product.id}
                    href={`/catalogo/${product.slug}`}
                    className="group bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
                  >
                    {/* Image placeholder */}
                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                      {product.images.length > 0 ? (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                          {product.images[0].altText || product.name}
                        </div>
                      ) : (
                        <div className="text-gray-400">
                          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <p className="text-xs text-amber-600 uppercase tracking-wider mb-1">
                        {product.category.name}
                      </p>
                      <h2 className="text-gray-900 font-medium group-hover:text-amber-600 transition-colors">
                        {product.name}
                      </h2>
                      {product.material && (
                        <p className="text-sm text-gray-500 mt-1">{product.material}</p>
                      )}
                      {product.basePriceCop && (
                        <p className="mt-2 text-lg font-semibold text-gray-900">
                          ${Number(product.basePriceCop).toLocaleString('es-CO')} COP
                        </p>
                      )}
                      {product.variants.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
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
              <nav className="flex justify-center mt-8 gap-2">
                {currentPage > 1 && (
                  <Link
                    href={`/catalogo?${new URLSearchParams({ ...params, page: String(currentPage - 1) }).toString()}`}
                    className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
                  >
                    Anterior
                  </Link>
                )}
                {Array.from({ length: products.totalPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={`/catalogo?${new URLSearchParams({ ...params, page: String(p) }).toString()}`}
                    className={`px-4 py-2 text-sm border rounded-md ${p === currentPage ? 'bg-amber-500 text-white border-amber-500' : 'hover:bg-gray-50'}`}
                  >
                    {p}
                  </Link>
                ))}
                {currentPage < products.totalPages && (
                  <Link
                    href={`/catalogo?${new URLSearchParams({ ...params, page: String(currentPage + 1) }).toString()}`}
                    className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
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
  );
}
