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
  X,
  Loader2,
  Check,
  Pencil,
  Trash2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

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

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  seoTitle: string | null;
  seoDesc: string | null;
  productCount: number;
}

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  sortOrder: number;
  isActive: boolean;
  seoTitle: string;
  seoDesc: string;
}

const emptyCategoryForm: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  parentId: '',
  sortOrder: 0,
  isActive: true,
  seoTitle: '',
  seoDesc: '',
};

function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsTotal, setProductsTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tab, setTab] = useState<'products' | 'categories'>('products');
  const limit = 15;

  // Category modal state
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState<CategoryForm>(emptyCategoryForm);
  const [catEditing, setCatEditing] = useState<string | null>(null);
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState('');
  const [catSuccess, setCatSuccess] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          slug,
          description,
          material,
          base_price_cop,
          is_active,
          is_featured,
          created_at,
          category:categories!category_id ( id, name, slug ),
          variants:product_variants ( id, name ),
          images:product_images ( id, storage_path, is_primary )
        `, { count: 'exact' })
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (search) query = query.ilike('name', `%${search}%`);
      if (categoryFilter) query = query.eq('category_id', categoryFilter);

      const { data, error, count } = await query.range(from, to);

      if (!error && data) {
        setProducts(data.map((p: Record<string, unknown>) => {
          const cat = Array.isArray(p.category) ? (p.category as Record<string, unknown>[])[0] : p.category as Record<string, unknown>;
          return {
            id: p.id as string,
            name: p.name as string,
            slug: p.slug as string,
            description: p.description as string | null,
            material: p.material as string | null,
            basePriceCop: p.base_price_cop as number | null,
            isActive: p.is_active as boolean,
            isFeatured: p.is_featured as boolean,
            createdAt: p.created_at as string,
            category: cat ? { id: cat.id as string, name: cat.name as string, slug: cat.slug as string } : { id: '', name: '—', slug: '' },
            variants: ((p.variants as Record<string, unknown>[]) || []).map((v) => ({ id: v.id as string, name: v.name as string })),
            images: ((p.images as Record<string, unknown>[]) || []).map((img) => ({
              id: img.id as string,
              storagePath: img.storage_path as string,
              isPrimary: img.is_primary as boolean,
            })),
          };
        }));
        setProductsTotal(count || 0);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, categoryFilter]);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, description, parent_id, sort_order, is_active, seo_title, seo_description, products ( id )')
      .is('deleted_at', null)
      .order('sort_order')
      .order('name');

    if (!error && data) {
      setCategories(data.map((c: Record<string, unknown>) => ({
        id: c.id as string,
        name: c.name as string,
        slug: c.slug as string,
        description: c.description as string | null,
        parentId: c.parent_id as string | null,
        sortOrder: c.sort_order as number,
        isActive: c.is_active as boolean,
        seoTitle: c.seo_title as string | null,
        seoDesc: c.seo_description as string | null,
        productCount: ((c.products as unknown[]) || []).length,
      })));
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const toggleActive = async (id: string, isActive: boolean) => {
    await supabase.from('products').update({ is_active: !isActive }).eq('id', id);
    fetchProducts();
  };

  const toggleFeatured = async (id: string, isFeatured: boolean) => {
    await supabase.from('products').update({ is_featured: !isFeatured }).eq('id', id);
    fetchProducts();
  };

  const totalPages = productsTotal > 0 ? Math.ceil(productsTotal / limit) : 0;

  // Category modal helpers
  const openNewCategory = () => {
    setCatEditing(null);
    setCatForm(emptyCategoryForm);
    setAutoSlug(true);
    setCatError('');
    setCatSuccess(false);
    setCatModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setCatEditing(cat.id);
    setCatForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      parentId: cat.parentId || '',
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
      seoTitle: cat.seoTitle || '',
      seoDesc: cat.seoDesc || '',
    });
    setAutoSlug(false);
    setCatError('');
    setCatSuccess(false);
    setCatModalOpen(true);
  };

  const closeCatModal = () => {
    setCatModalOpen(false);
    setCatEditing(null);
    setCatError('');
    setCatSuccess(false);
  };

  const handleCatNameChange = (val: string) => {
    setCatForm((f) => ({
      ...f,
      name: val,
      ...(autoSlug ? { slug: toSlug(val) } : {}),
    }));
  };

  const handleSaveCategory = async () => {
    if (!catForm.name.trim() || !catForm.slug.trim()) {
      setCatError('Nombre y slug son requeridos.');
      return;
    }
    setCatSaving(true);
    setCatError('');
    setCatSuccess(false);

    const payload = {
      name: catForm.name.trim(),
      slug: catForm.slug.trim(),
      description: catForm.description.trim() || null,
      parent_id: catForm.parentId || null,
      sort_order: catForm.sortOrder,
      is_active: catForm.isActive,
      seo_title: catForm.seoTitle.trim() || null,
      seo_description: catForm.seoDesc.trim() || null,
    };

    let error;
    if (catEditing) {
      ({ error } = await supabase.from('categories').update(payload).eq('id', catEditing));
    } else {
      ({ error } = await supabase.from('categories').insert(payload));
    }

    setCatSaving(false);

    if (error) {
      setCatError(error.message.includes('unique') ? 'Ya existe una categoría con este slug.' : error.message);
    } else {
      setCatSuccess(true);
      await fetchCategories();
      setTimeout(() => closeCatModal(), 600);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la categoría "${name}"? Los productos asociados quedarán sin categoría.`)) return;
    await supabase.from('categories').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    fetchCategories();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-cream-100">Catálogo</h1>
          <p className="text-sm text-charcoal-400 mt-1">Gestión de productos y categorías</p>
        </div>
        {tab === 'products' ? (
          <Link
            href="/admin/catalogo/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors"
          >
            <Plus size={16} /> Nuevo Producto
          </Link>
        ) : (
          <button
            onClick={openNewCategory}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors"
          >
            <Plus size={16} /> Nueva Categoría
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-charcoal-800 rounded-md p-1 w-fit">
        <button
          onClick={() => setTab('products')}
          className={`px-4 py-2 text-sm rounded ${tab === 'products' ? 'bg-charcoal-700 text-cream-200' : 'text-charcoal-400 hover:text-charcoal-300'}`}
        >
          Productos ({productsTotal})
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
          {!loading && productsTotal === 0 && !search && !categoryFilter ? (
            <div className="bg-charcoal-800 rounded-lg border border-white/5 p-12 text-center">
              <Package size={40} className="mx-auto text-charcoal-600 mb-4" />
              <h2 className="text-lg font-serif text-cream-200 mb-2">Aún no hay productos</h2>
              <p className="text-sm text-charcoal-400 mb-6 max-w-sm mx-auto">
                Agrega tu primer producto al catálogo para que tus clientes puedan verlo.
              </p>
              <Link
                href="/admin/catalogo/nuevo"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors"
              >
                <Plus size={16} /> Crear primer producto
              </Link>
            </div>
          ) : (
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
                    <option key={c.id} value={c.id}>{c.name} ({c.productCount})</option>
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
                      {!loading && products.map((p) => (
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
                      {!loading && products.length === 0 && (
                        <tr><td colSpan={7} className="px-5 py-12 text-center text-charcoal-500">No se encontraron productos con esos filtros</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
                    <p className="text-xs text-charcoal-500">Página {page} de {totalPages}</p>
                    <div className="flex gap-1">
                      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-white/5 text-charcoal-400 disabled:opacity-30"><ChevronLeft size={16} /></button>
                      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-white/5 text-charcoal-400 disabled:opacity-30"><ChevronRight size={16} /></button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'categories' && (
        <div className="bg-charcoal-800 rounded-lg border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Nombre</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Slug</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Descripción</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Productos</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Estado</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Orden</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-cream-200">{c.name}</td>
                  <td className="px-5 py-3 text-charcoal-400 text-xs font-mono">/{c.slug}</td>
                  <td className="px-5 py-3 text-charcoal-400 text-xs max-w-[200px] truncate">{c.description || '—'}</td>
                  <td className="px-5 py-3 text-charcoal-400">{c.productCount}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded ${c.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-charcoal-600/40 text-charcoal-400'}`}>
                      {c.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-charcoal-500 text-xs">{c.sortOrder}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditCategory(c)}
                        className="p-1.5 rounded hover:bg-white/5 text-charcoal-400 hover:text-gold-400 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      {c.productCount === 0 && (
                        <button
                          onClick={() => handleDeleteCategory(c.id, c.name)}
                          className="p-1.5 rounded hover:bg-white/5 text-charcoal-400 hover:text-red-400 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-charcoal-500">No hay categorías. Crea la primera.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Category Create/Edit Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeCatModal} />
          <div className="relative bg-charcoal-800 border border-white/10 rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h2 className="text-lg font-serif text-cream-100">
                {catEditing ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
              <button onClick={closeCatModal} className="p-1.5 rounded hover:bg-white/5 text-charcoal-400 hover:text-cream-200 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {catError && (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{catError}</div>
              )}
              {catSuccess && (
                <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                  <Check size={14} /> {catEditing ? 'Categoría actualizada' : 'Categoría creada correctamente'}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs text-charcoal-400 mb-1.5">Nombre *</label>
                <input
                  type="text"
                  value={catForm.name}
                  onChange={(e) => handleCatNameChange(e.target.value)}
                  placeholder="Ej: Anillos de compromiso"
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs text-charcoal-400 mb-1.5">Slug *</label>
                <input
                  type="text"
                  value={catForm.slug}
                  onChange={(e) => { setAutoSlug(false); setCatForm((f) => ({ ...f, slug: e.target.value })); }}
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 font-mono focus:outline-none focus:border-gold-500/30"
                />
                <p className="text-[11px] text-charcoal-500 mt-1">Se genera automáticamente desde el nombre</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-charcoal-400 mb-1.5">Descripción</label>
                <textarea
                  value={catForm.description}
                  onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Descripción breve de la categoría..."
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30 resize-none"
                />
              </div>

              {/* Parent + Sort Order */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-charcoal-400 mb-1.5">Categoría padre</label>
                  <select
                    value={catForm.parentId}
                    onChange={(e) => setCatForm((f) => ({ ...f, parentId: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
                  >
                    <option value="">Ninguna (raíz)</option>
                    {categories.filter((c) => c.id !== catEditing).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-charcoal-400 mb-1.5">Orden</label>
                  <input
                    type="number"
                    value={catForm.sortOrder}
                    onChange={(e) => setCatForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                    min={0}
                    className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
                  />
                </div>
              </div>

              {/* SEO */}
              <details className="group">
                <summary className="text-xs text-charcoal-400 cursor-pointer hover:text-charcoal-300 transition-colors">
                  SEO (opcional)
                </summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs text-charcoal-400 mb-1.5">Título SEO</label>
                    <input
                      type="text"
                      value={catForm.seoTitle}
                      onChange={(e) => setCatForm((f) => ({ ...f, seoTitle: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-charcoal-400 mb-1.5">Meta descripción</label>
                    <textarea
                      value={catForm.seoDesc}
                      onChange={(e) => setCatForm((f) => ({ ...f, seoDesc: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30 resize-none"
                    />
                  </div>
                </div>
              </details>

              {/* Active toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-cream-200">Categoría activa</p>
                  <p className="text-xs text-charcoal-500 mt-0.5">
                    {catForm.isActive ? 'Visible en el catálogo' : 'Oculta del catálogo'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCatForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${catForm.isActive ? 'bg-emerald-500' : 'bg-charcoal-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${catForm.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/5 flex items-center justify-end gap-3">
              <button onClick={closeCatModal} className="px-4 py-2 text-sm text-charcoal-300 hover:text-cream-200 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={catSaving || !catForm.name.trim() || !catForm.slug.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {catSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                {catSaving ? 'Guardando...' : catEditing ? 'Guardar cambios' : 'Crear categoría'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
