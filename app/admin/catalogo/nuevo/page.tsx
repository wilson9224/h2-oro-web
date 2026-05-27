'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ImageIcon, Loader2, Plus, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

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
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name, slug')
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setCategories(data as Category[]);
      });
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
      const productSlug = slug || name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const { data: product, error: prodErr } = await supabase
        .from('products')
        .insert({
          name,
          slug: productSlug,
          description: description || null,
          material: material || null,
          base_price_cop: basePriceCop ? Number(basePriceCop) : null,
          category_id: categoryId,
          is_active: isActive,
          is_featured: isFeatured,
        })
        .select('id')
        .single();

      if (prodErr) throw new Error(prodErr.message);

      if (product && imageFiles.length > 0) {
        const uploadedImages = [];

        for (let index = 0; index < imageFiles.length; index += 1) {
          const file = imageFiles[index];
          const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
          const safeName = `${product.id}/${Date.now()}-${index}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from('products')
            .upload(safeName, file, { upsert: true, contentType: file.type || undefined });

          if (uploadErr) throw new Error(uploadErr.message);

          uploadedImages.push({
            product_id: product.id,
            storage_path: safeName,
            alt_text: name,
            sort_order: index,
            is_primary: index === 0,
          });
        }

        const { error: imageErr } = await supabase.from('product_images').insert(uploadedImages);
        if (imageErr) throw new Error(imageErr.message);
      }

      // Insert variants if any
      const validVariants = variants.filter((v) => v.name);
      if (validVariants.length > 0 && product) {
        const { error: varErr } = await supabase
          .from('product_variants')
          .insert(validVariants.map((v) => ({
            product_id: product.id,
            name: v.name,
            material: v.material || null,
            price_cop: v.priceCop ? Number(v.priceCop) : null,
          })));
        if (varErr) console.error('Error creando variantes:', varErr.message);
      }

      router.push('/admin/catalogo');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creando producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20 lg:pb-0">
      <Link href="/admin/catalogo" className="inline-flex items-center gap-2 text-sm text-charcoal-400 hover:text-cream-200 transition-colors">
        <ArrowLeft size={16} /> Catálogo
      </Link>

      <div>
        <h1 className="text-2xl font-serif text-cream-100">Nuevo Producto</h1>
        <p className="text-sm text-charcoal-400 mt-1">Agregar producto al catálogo público sin alterar las portadas fijas de colección.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        <section className="rounded-2xl p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
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
        </section>

        <section className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Imágenes del producto</label>
            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-charcoal-800/70 px-4 py-6 text-center transition-colors hover:border-gold-500/25">
              <ImageIcon size={24} className="mb-2 text-charcoal-400" />
              <span className="text-sm text-cream-200">Subir fotos</span>
              <span className="mt-1 text-xs text-charcoal-400">La primera será la imagen principal del catálogo</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  setImageFiles(files.slice(0, 6));
                }}
              />
            </label>
          </div>
          {imageFiles.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {imageFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-xl border border-white/5 bg-charcoal-800 p-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-charcoal-900 text-xs text-gold-400">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-charcoal-300">{file.name}</span>
                  <button type="button" onClick={() => setImageFiles((files) => files.filter((_, i) => i !== index))} className="shrink-0 text-charcoal-500 hover:text-red-400">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
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
                <div key={i} className="bg-charcoal-800 border border-white/5 rounded-xl p-3 flex gap-3 items-start">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
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
        </section>

        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-2 border-t border-white/10 bg-charcoal-950/95 p-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold-500 px-6 py-2.5 text-sm font-medium text-charcoal-900 transition-colors hover:bg-gold-400 disabled:opacity-50 lg:flex-none"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Crear Producto
          </button>
          <Link href="/admin/catalogo" className="rounded-xl px-4 py-2.5 text-sm text-charcoal-400 hover:text-cream-200 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
