'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Star,
  Eye,
  EyeOff,
  Package,
} from 'lucide-react';
import { useApi } from '@/hooks/use-api';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  material: string | null;
  basePriceCop: number | null;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  category: { id: string; name: string; slug: string };
  variants: { id: string; name: string }[];
  images: { id: string; storagePath: string; isPrimary: boolean }[];
}

interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
}

export default function CatalogPage() {
  const api = useApi();
  const [products, setProducts] = useState<ProductsResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tab, setTab] = useState<'products' | 'categories'>('products');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (search) params.set('search', search);
      if (categoryFilter) params.set('categoryId', categoryFilter);
      const data = await api.get<ProductsResponse>(`/catalog/products?${params}`);
      setProducts(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, categoryFilter]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.get<Category[]>('/catalog/categories');
      setCategories(data);
    } catch (e) { console.error(e); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/catalog/products/${id}`, { isActive: !isActive });
      fetchProducts();
    } catch (e) { console.error(e); }
  };

  const toggleFeatured = async (id: string, isFeatured: boolean) => {
    try {
      await api.patch(`/catalog/products/${id}`, { isFeatured: !isFeatured });
      fetchProducts();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-cream-100">Catálogo</h1>
          <p className="text-sm text-charcoal-400 mt-1">Gestión de productos y categorías</p>
        </div>
        <Link
          href="/admin/catalogo/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors"
        >
          <Plus size={16} /> Nuevo Producto
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-charcoal-800 rounded-md p-1 w-fit">
        <button
          onClick={() => setTab('products')}
          className={`px-4 py-2 text-sm rounded ${tab === 'products' ? 'bg-charcoal-700 text-cream-200' : 'text-charcoal-400 hover:text-charcoal-300'}`}
        >
          Productos {products ? `(${products.total})` : ''}
        </button>
        <button
          onClick={() => setTab('categories')}
          className={`px-4 py-2 text-sm rounded ${tab === 'categories' ? 'bg-charcoal-700 text-cream-200' : 'text-charcoal-400 hover:text-charcoal-300'}`}
        >
          Categorías ({categories.length})
        </button>
      </div>

      {tab === 'products' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c._count.products})</option>
              ))}
            </select>
          </div>

          {/* Products Table */}
          <div className="bg-charcoal-800 rounded-lg border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Producto</th>
                    <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Categoría</th>
                    <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Material</th>
                    <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Precio</th>
                    <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Variantes</th>
                    <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Estado</th>
                    <th className="px-5 py-3 text-xs text-charcoal-400 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-charcoal-700 rounded animate-pulse w-20" /></td>
                      ))}
                    </tr>
                  ))}
                  {!loading && products?.data.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-charcoal-700 rounded flex items-center justify-center">
                            <Package size={16} className="text-charcoal-500" />
                          </div>
                          <div>
                            <p className="text-cream-200 text-sm">{p.name}</p>
                            <p className="text-charcoal-500 text-[11px]">/{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-charcoal-400 text-xs">{p.category.name}</td>
                      <td className="px-5 py-3 text-charcoal-400 text-xs">{p.material || '—'}</td>
                      <td className="px-5 py-3 text-charcoal-300 text-xs font-mono">
                        {p.basePriceCop
                          ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(p.basePriceCop))
                          : '—'}
                      </td>
                      <td className="px-5 py-3 text-charcoal-400 text-xs">{p.variants.length}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] px-2 py-0.5 rounded ${p.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-charcoal-600/40 text-charcoal-400'}`}>
                            {p.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                          {p.isFeatured && <Star size={12} className="text-gold-400 fill-gold-400" />}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => toggleFeatured(p.id, p.isFeatured)} className="p-1.5 rounded hover:bg-white/5 text-charcoal-500 hover:text-gold-400 transition-colors" title="Destacar">
                            <Star size={14} className={p.isFeatured ? 'fill-gold-400 text-gold-400' : ''} />
                          </button>
                          <button onClick={() => toggleActive(p.id, p.isActive)} className="p-1.5 rounded hover:bg-white/5 text-charcoal-500 hover:text-cream-200 transition-colors" title={p.isActive ? 'Desactivar' : 'Activar'}>
                            {p.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <Link href={`/admin/catalogo/${p.id}`} className="p-1.5 rounded hover:bg-white/5 text-charcoal-500 hover:text-cream-200 transition-colors">
                            <Edit3 size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && products?.data.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-charcoal-500">No se encontraron productos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {products && products.totalPages > 1 && (
              <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
                <p className="text-xs text-charcoal-500">Página {products.page} de {products.totalPages}</p>
                <div className="flex gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-white/5 text-charcoal-400 disabled:opacity-30"><ChevronLeft size={16} /></button>
                  <button onClick={() => setPage((p) => Math.min(products.totalPages, p + 1))} disabled={page === products.totalPages} className="p-1.5 rounded hover:bg-white/5 text-charcoal-400 disabled:opacity-30"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'categories' && (
        <div className="bg-charcoal-800 rounded-lg border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Nombre</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Slug</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Productos</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3 text-cream-200">{c.name}</td>
                  <td className="px-5 py-3 text-charcoal-400 text-xs font-mono">/{c.slug}</td>
                  <td className="px-5 py-3 text-charcoal-400">{c._count.products}</td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-charcoal-500">No hay categorías</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
