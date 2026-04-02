'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApi } from '@/hooks/use-api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  role: { name: string; description: string };
}

interface UsersResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
}

const roleBadges: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-gold-500/20 text-gold-400' },
  manager: { label: 'Gerente', color: 'bg-blue-500/20 text-blue-400' },
  jeweler: { label: 'Joyero', color: 'bg-emerald-500/20 text-emerald-400' },
  designer: { label: 'Diseñador', color: 'bg-purple-500/20 text-purple-400' },
  client: { label: 'Cliente', color: 'bg-charcoal-600/40 text-charcoal-300' },
};

export default function UsersPage() {
  const api = useApi();
  const [users, setUsers] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    api.get<UsersResponse>(`/users?page=${page}&limit=20`)
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = users ? Math.ceil(users.total / 20) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-cream-100">Usuarios</h1>
          <p className="text-sm text-charcoal-400 mt-1">
            {users ? `${users.total} usuario${users.total !== 1 ? 's' : ''} registrados` : 'Cargando...'}
          </p>
        </div>
      </div>

      <div className="bg-charcoal-800 rounded-lg border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Nombre</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Email</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Teléfono</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Rol</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Estado</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Registro</th>
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
              {!loading && users?.data.map((u) => {
                const badge = roleBadges[u.role.name] || { label: u.role.name, color: 'bg-charcoal-700 text-charcoal-300' };
                return (
                  <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-charcoal-700 flex items-center justify-center text-xs text-charcoal-300 font-medium">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <span className="text-cream-200">{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-charcoal-400 text-xs">{u.email}</td>
                    <td className="px-5 py-3 text-charcoal-400 text-xs">{u.phone || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded ${badge.color}`}>{badge.label}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded ${u.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-charcoal-500 text-xs">
                      {new Date(u.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                );
              })}
              {!loading && users?.data.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-charcoal-500">No hay usuarios</td></tr>
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
    </div>
  );
}
