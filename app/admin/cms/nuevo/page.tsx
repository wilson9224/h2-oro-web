'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useApi } from '@/hooks/use-api';

export default function NewCmsPage() {
  const api = useApi();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [type, setType] = useState('page');
  const [slug, setSlug] = useState('');
  const [titleEs, setTitleEs] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [contentEs, setContentEs] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !titleEs) {
      setError('Slug y título en español son obligatorios');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/cms', {
        type,
        slug,
        titleEs,
        titleEn: titleEn || undefined,
        contentEs: contentEs || undefined,
        contentEn: contentEn || undefined,
        isPublished,
        ...(isPublished ? { publishedAt: new Date().toISOString() } : {}),
      });
      router.push('/admin/cms');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creando contenido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/cms" className="inline-flex items-center gap-2 text-sm text-charcoal-400 hover:text-cream-200 transition-colors">
        <ArrowLeft size={16} /> CMS
      </Link>

      <div>
        <h1 className="text-2xl font-serif text-cream-100">Nuevo Contenido</h1>
        <p className="text-sm text-charcoal-400 mt-1">Crear página, blog, FAQ, banner o política</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
            >
              <option value="page">Página</option>
              <option value="blog">Blog</option>
              <option value="faq">FAQ</option>
              <option value="testimonial">Testimonio</option>
              <option value="banner">Banner</option>
              <option value="policy">Política</option>
            </select>
          </div>
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="mi-pagina"
              required
              className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Título (ES) *</label>
          <input
            type="text"
            value={titleEs}
            onChange={(e) => setTitleEs(e.target.value)}
            required
            className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
          />
        </div>

        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Título (EN)</label>
          <input
            type="text"
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
          />
        </div>

        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Contenido (ES)</label>
          <textarea
            value={contentEs}
            onChange={(e) => setContentEs(e.target.value)}
            rows={8}
            className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">Contenido (EN)</label>
          <textarea
            value={contentEn}
            onChange={(e) => setContentEn(e.target.value)}
            rows={6}
            className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30 resize-none"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="w-4 h-4 rounded bg-charcoal-800 border-charcoal-600 text-gold-500 focus:ring-gold-500"
          />
          <span className="text-sm text-charcoal-300">Publicar inmediatamente</span>
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Crear Contenido
          </button>
          <Link href="/admin/cms" className="px-4 py-2.5 text-sm text-charcoal-400 hover:text-cream-200 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
