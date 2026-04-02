'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { useApi } from '@/hooks/use-api';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface VariantInput {
  name: string;
  material: string;
  priceCop: string;
}

export default function NewProductPage() {
  const api = useApi();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [material, setMaterial] = useState('');
  const [basePriceCop, setBasePriceCop] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [variants, setVariants] = useState<VariantInput[]>([]);

  useEffect(() => {
    api.get<Category[]>('/catalog/categories').then(setCategories).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addVariant = () => setVariants([...variants, { name: '', material: '', priceCop: '' }]);
  const removeVariant = (i: number) => setVariants(variants.filter((_, idx) => idx !== i));
  const updateVariant = (i: number, field: keyof VariantInput, value: string) => {
    const updated = [...variants];
    updated[i] = { ...updated[i], [field]: value };
    setVariants(updated);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !categoryId) {
      setError('Nombre y categoría son obligatorios');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post<{ id: string }>('/catalog/products', {
        name,
        slug: slug || undefined,
        description: description || undefined,
        material: material || undefined,
        basePriceCop: basePriceCop ? Number(basePriceCop) : undefined,
        categoryId,
        isActive,
        isFeatured,
        variants: variants.filter((v) => v.name).map((v) => ({
          name: v.name,
          material: v.material || undefined,
          priceCop: v.priceCop ? Number(v.priceCop) : undefined,
        })),
      });
      router.push('/admin/catalogo');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creando producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/catalogo" className="inline-flex items-center gap-2 text-sm text-charcoal-400 hover:text-cream-200 transition-colors">
        <ArrowLeft size={16} /> Catálogo
      </Link>

      <div>
        <h1 className="text-2xl font-serif text-cream-100">Nuevo Producto</h1>
        <p className="text-sm text-charcoal-400 mt-1">Agregar producto al catálogo</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              placeholder="Anillo Oro 18k"
              className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
            />
          </div>
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="anillo-oro-18k"
              className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Categoría *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
            >
              <option value="">Seleccionar...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Material</label>
            <input
              type="text"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder="Oro 18k"
              className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Precio Base (COP)</label>
          <input
            type="number"
            value={basePriceCop}
            onChange={(e) => setBasePriceCop(e.target.value)}
            placeholder="500000"
            className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
          />
        </div>

        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Descripción del producto..."
            className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30 resize-none"
          />
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded bg-charcoal-800 border-charcoal-600 text-gold-500 focus:ring-gold-500" />
            <span className="text-sm text-charcoal-300">Activo</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="w-4 h-4 rounded bg-charcoal-800 border-charcoal-600 text-gold-500 focus:ring-gold-500" />
            <span className="text-sm text-charcoal-300">Destacado</span>
          </label>
        </div>

        {/* Variants */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs tracking-widest uppercase text-charcoal-400">Variantes</label>
            <button type="button" onClick={addVariant} className="inline-flex items-center gap-1 text-xs text-gold-500 hover:text-gold-400 transition-colors">
              <Plus size={14} /> Agregar variante
            </button>
          </div>
          {variants.length > 0 && (
            <div className="space-y-3">
              {variants.map((v, i) => (
                <div key={i} className="bg-charcoal-800 border border-white/5 rounded-md p-3 flex gap-3 items-start">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input type="text" placeholder="Nombre" value={v.name} onChange={(e) => updateVariant(i, 'name', e.target.value)} className="px-2 py-1.5 bg-charcoal-900 border border-white/5 rounded text-xs text-cream-200 placeholder:text-charcoal-600 focus:outline-none" />
                    <input type="text" placeholder="Material" value={v.material} onChange={(e) => updateVariant(i, 'material', e.target.value)} className="px-2 py-1.5 bg-charcoal-900 border border-white/5 rounded text-xs text-cream-200 placeholder:text-charcoal-600 focus:outline-none" />
                    <input type="number" placeholder="Precio COP" value={v.priceCop} onChange={(e) => updateVariant(i, 'priceCop', e.target.value)} className="px-2 py-1.5 bg-charcoal-900 border border-white/5 rounded text-xs text-cream-200 placeholder:text-charcoal-600 focus:outline-none" />
                  </div>
                  <button type="button" onClick={() => removeVariant(i)} className="text-charcoal-500 hover:text-red-400 mt-1"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Crear Producto
          </button>
          <Link href="/admin/catalogo" className="px-4 py-2.5 text-sm text-charcoal-400 hover:text-cream-200 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
