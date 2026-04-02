'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Image,
  HelpCircle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { useApi } from '@/hooks/use-api';

interface CmsPage {
  id: string;
  slug: string;
  type: string;
  titleEs: string;
  titleEn: string | null;
  isPublished: boolean;
  sortOrder: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CmsResponse {
  data: CmsPage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const typeConfig: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  page: { label: 'Página', icon: FileText, color: 'bg-blue-500/20 text-blue-400' },
  blog: { label: 'Blog', icon: Globe, color: 'bg-purple-500/20 text-purple-400' },
  faq: { label: 'FAQ', icon: HelpCircle, color: 'bg-cyan-500/20 text-cyan-400' },
  testimonial: { label: 'Testimonio', icon: MessageSquare, color: 'bg-emerald-500/20 text-emerald-400' },
  banner: { label: 'Banner', icon: Image, color: 'bg-orange-500/20 text-orange-400' },
  policy: { label: 'Política', icon: FileText, color: 'bg-charcoal-600/40 text-charcoal-300' },
};

export default function CmsAdminPage() {
  const api = useApi();
  const [pages, setPages] = useState<CmsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (typeFilter) params.set('type', typeFilter);
      if (search) params.set('search', search);
      const data = await api.get<CmsResponse>(`/cms?${params}`);
      setPages(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, typeFilter, search]);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const togglePublish = async (id: string, isPublished: boolean) => {
    try {
      await api.patch(`/cms/${id}`, {
        isPublished: !isPublished,
        ...(!isPublished ? { publishedAt: new Date().toISOString() } : {}),
      });
      fetchPages();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-cream-100">CMS</h1>
          <p className="text-sm text-charcoal-400 mt-1">Gestión de contenido del sitio</p>
        </div>
        <Link
          href="/admin/cms/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors"
        >
          <Plus size={16} /> Nuevo Contenido
        </Link>
      </div>

      {/* Type tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setTypeFilter(''); setPage(1); }}
          className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${!typeFilter ? 'bg-gold-500/10 border-gold-500/30 text-gold-400' : 'border-white/5 text-charcoal-400 hover:text-charcoal-300'}`}
        >
          Todos
        </button>
        {Object.entries(typeConfig).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => { setTypeFilter(key); setPage(1); }}
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${typeFilter === key ? 'bg-gold-500/10 border-gold-500/30 text-gold-400' : 'border-white/5 text-charcoal-400 hover:text-charcoal-300'}`}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
        <input
          type="text"
          placeholder="Buscar contenido..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
        />
      </div>

      {/* Table */}
      <div className="bg-charcoal-800 rounded-lg border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Título</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Tipo</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Slug</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Estado</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Actualizado</th>
                <th className="px-5 py-3 text-xs text-charcoal-400 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-charcoal-700 rounded animate-pulse w-24" /></td>
                  ))}
                </tr>
              ))}
              {!loading && pages?.data.map((p) => {
                const cfg = typeConfig[p.type] || typeConfig.page;
                const Icon = cfg.icon;
                return (
                  <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Icon size={16} className="text-charcoal-500" />
                        <div>
                          <p className="text-cream-200">{p.titleEs}</p>
                          {p.titleEn && <p className="text-charcoal-500 text-[11px]">EN: {p.titleEn}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded ${cfg.color}`}>{cfg.label}</span>
                    </td>
                    <td className="px-5 py-3 text-charcoal-400 text-xs font-mono">/{p.slug}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded ${p.isPublished ? 'bg-emerald-500/20 text-emerald-400' : 'bg-charcoal-600/40 text-charcoal-400'}`}>
                        {p.isPublished ? 'Publicado' : 'Borrador'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-charcoal-500 text-xs">
                      {new Date(p.updatedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => togglePublish(p.id, p.isPublished)}
                          className="p-1.5 rounded hover:bg-white/5 text-charcoal-500 hover:text-cream-200 transition-colors"
                          title={p.isPublished ? 'Despublicar' : 'Publicar'}
                        >
                          {p.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <Link href={`/admin/cms/${p.id}`} className="p-1.5 rounded hover:bg-white/5 text-charcoal-500 hover:text-cream-200 transition-colors">
                          <Edit3 size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && pages?.data.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-charcoal-500">No se encontró contenido</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {pages && pages.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
            <p className="text-xs text-charcoal-500">Página {pages.page} de {pages.totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-white/5 text-charcoal-400 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage((p) => Math.min(pages.totalPages, p + 1))} disabled={page === pages.totalPages} className="p-1.5 rounded hover:bg-white/5 text-charcoal-400 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
