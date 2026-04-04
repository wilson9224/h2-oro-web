'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Pencil, X, Loader2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  roleId: string;
  role: { name: string; description: string };
}

interface EditForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleId: string;
  isActive: boolean;
}

const roleBadges: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-gold-500/20 text-gold-400' },
  manager: { label: 'Gerente', color: 'bg-blue-500/20 text-blue-400' },
  jeweler: { label: 'Joyero', color: 'bg-emerald-500/20 text-emerald-400' },
  designer: { label: 'Diseñador', color: 'bg-purple-500/20 text-purple-400' },
  client: { label: 'Cliente', color: 'bg-charcoal-600/40 text-charcoal-300' },
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ firstName: '', lastName: '', email: '', phone: '', roleId: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const limit = 20;

  // Fetch roles once
  useEffect(() => {
    supabase.from('roles').select('id, name, description').order('name').then(({ data }) => {
      if (data) setRoles(data as Role[]);
    });
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone,
        is_active,
        created_at,
        role_id,
        roles ( name, description )
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data) {
      setUsers(data.map((u: Record<string, unknown>) => {
        const role = Array.isArray(u.roles) ? (u.roles as Record<string, string>[])[0] : u.roles as Record<string, string>;
        return {
          id: u.id as string,
          email: u.email as string,
          firstName: u.first_name as string,
          lastName: u.last_name as string,
          phone: u.phone as string | null,
          isActive: u.is_active as boolean,
          createdAt: u.created_at as string,
          roleId: u.role_id as string,
          role: role ? { name: role.name, description: role.description || '' } : { name: 'unknown', description: '' },
        };
      }));
      setTotal(count || 0);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      roleId: user.roleId,
      isActive: user.isActive,
    });
    setSaveError('');
    setSaveSuccess(false);
  };

  const closeEdit = () => {
    setEditingUser(null);
    setSaveError('');
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    const { error } = await supabase
      .from('users')
      .update({
        first_name: editForm.firstName,
        last_name: editForm.lastName,
        email: editForm.email,
        phone: editForm.phone || null,
        role_id: editForm.roleId,
        is_active: editForm.isActive,
      })
      .eq('id', editingUser.id);

    setSaving(false);

    if (error) {
      setSaveError(error.message);
    } else {
      setSaveSuccess(true);
      await fetchUsers();
      setTimeout(() => closeEdit(), 800);
    }
  };

  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-cream-100">Usuarios</h1>
          <p className="text-sm text-charcoal-400 mt-1">
            {loading ? 'Cargando...' : `${total} usuario${total !== 1 ? 's' : ''} registrados`}
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
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-charcoal-700 rounded animate-pulse w-24" /></td>
                  ))}
                </tr>
              ))}
              {!loading && users.map((u) => {
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
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 rounded hover:bg-white/5 text-charcoal-400 hover:text-gold-400 transition-colors"
                        title="Editar usuario"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && users.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-charcoal-500">No hay usuarios</td></tr>
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

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeEdit} />

          {/* Modal */}
          <div className="relative bg-charcoal-800 border border-white/10 rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div>
                <h2 className="text-lg font-serif text-cream-100">Editar Usuario</h2>
                <p className="text-xs text-charcoal-400 mt-0.5">{editingUser.email}</p>
              </div>
              <button onClick={closeEdit} className="p-1.5 rounded hover:bg-white/5 text-charcoal-400 hover:text-cream-200 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {saveError && (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {saveError}
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                  <Check size={14} /> Usuario actualizado correctamente
                </div>
              )}

              {/* Name row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-charcoal-400 mb-1.5">Nombre</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs text-charcoal-400 mb-1.5">Apellido</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs text-charcoal-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs text-charcoal-400 mb-1.5">Teléfono</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+57 300 123 4567"
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs text-charcoal-400 mb-1.5">Rol</label>
                <select
                  value={editForm.roleId}
                  onChange={(e) => setEditForm((f) => ({ ...f, roleId: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {(roleBadges[r.name]?.label || r.name)}{r.description ? ` — ${r.description}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-cream-200">Estado de la cuenta</p>
                  <p className="text-xs text-charcoal-500 mt-0.5">
                    {editForm.isActive ? 'El usuario puede iniciar sesión' : 'El usuario no puede iniciar sesión'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${editForm.isActive ? 'bg-emerald-500' : 'bg-charcoal-600'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${editForm.isActive ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/5 flex items-center justify-end gap-3">
              <button
                onClick={closeEdit}
                className="px-4 py-2 text-sm text-charcoal-300 hover:text-cream-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editForm.firstName || !editForm.lastName || !editForm.email || !editForm.roleId}
                className="inline-flex items-center gap-2 px-5 py-2 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
