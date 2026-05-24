'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Pencil, X, Loader2, Check, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

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
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ firstName: '', lastName: '', email: '', phone: '', roleId: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const limit = 20;
  const isManager = currentUser?.role === 'manager';
  const clientRoleId = roles.find((role) => role.name === 'client')?.id;
  const columnCount = isManager ? 5 : 7;

  // Fetch roles once
  useEffect(() => {
    supabase.from('roles').select('id, name, description').order('name').then(({ data }) => {
      if (data) setRoles(data as Role[]);
      setRolesLoaded(true);
    });
  }, []);

  const fetchUsers = useCallback(async () => {
    if (isManager && !rolesLoaded) return;

    if (isManager && !clientRoleId) {
      setUsers([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const safeSearch = search.replace(/[,%]/g, '').trim();

    let query = supabase
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
      .order('created_at', { ascending: false });

    if (isManager && clientRoleId) query = query.eq('role_id', clientRoleId);
    if (safeSearch) {
      query = query.or(`first_name.ilike.%${safeSearch}%,last_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`);
    }

    const { data, error, count } = await query.range(from, to);

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
  }, [clientRoleId, isManager, page, rolesLoaded, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const openEdit = (user: User) => {
    if (isManager) return;
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
          <h1 className="text-2xl font-display font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>{isManager ? 'Clientes' : 'Usuarios'}</h1>
          <p className="text-sm mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
            {loading
              ? 'Cargando...'
              : isManager
                ? `${total} cliente${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}`
                : `${total} usuario${total !== 1 ? 's' : ''} registrados`}
          </p>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(242,240,237,0.25)' }} />
        <input
          type="text"
          placeholder={isManager ? 'Buscar cliente por nombre, email o teléfono...' : 'Buscar usuario por nombre, email o teléfono...'}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all duration-200 font-sans-custom"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: 'rgba(242,240,237,0.85)',
          }}
        />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Nombre</th>
                <th className="text-left px-5 py-3 text-xs font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Teléfono</th>
                {!isManager && <th className="text-left px-5 py-3 text-xs font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Rol</th>}
                <th className="text-left px-5 py-3 text-xs font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Estado</th>
                <th className="text-left px-5 py-3 text-xs font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Registro</th>
                {!isManager && <th className="px-5 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {loading && [...Array(5)].map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {[...Array(columnCount)].map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 rounded animate-pulse w-24" style={{ background: 'rgba(255,255,255,0.08)' }} /></td>
                  ))}
                </tr>
              ))}
              {!loading && users.map((u) => {
                const badge = roleBadges[u.role.name] || { label: u.role.name, color: 'bg-charcoal-700 text-charcoal-300' };
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(242,240,237,0.4)' }}>
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <span className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.5)' }}>{u.email}</td>
                    <td className="px-5 py-3 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.5)' }}>{u.phone || '—'}</td>
                    {!isManager && (
                      <td className="px-5 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded font-sans-custom ${badge.color}`}>{badge.label}</span>
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded font-sans-custom ${u.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                      {new Date(u.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    {!isManager && (
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded hover:bg-white/5 text-charcoal-400 hover:text-gold-400 transition-colors"
                          title="Editar usuario"
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {!loading && users.length === 0 && (
                <tr><td colSpan={columnCount} className="px-5 py-12 text-center text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>{isManager ? 'No hay clientes con esos criterios' : 'No hay usuarios'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Página {page} de {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded transition-all disabled:opacity-30" style={{ color: 'rgba(242,240,237,0.5)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}><ChevronLeft size={16} /></button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded transition-all disabled:opacity-30" style={{ color: 'rgba(242,240,237,0.5)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {!isManager && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeEdit} />

          {/* Modal */}
          <div className="relative rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" style={{ background: 'rgba(20,18,14,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <h2 className="text-lg font-display font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>Editar Usuario</h2>
                <p className="text-xs mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>{editingUser.email}</p>
              </div>
              <button onClick={closeEdit} className="p-1.5 rounded transition-colors" style={{ color: 'rgba(242,240,237,0.4)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.8)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.4)'}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {saveError && (
                <div className="p-3 rounded-2xl text-sm text-center font-sans-custom" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'rgba(248,113,113,0.9)' }}>
                  {saveError}
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 rounded-2xl text-sm flex items-center justify-center gap-2 font-sans-custom" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: 'rgba(16,185,129,0.9)' }}>
                  <Check size={14} /> Usuario actualizado correctamente
                </div>
              )}

              {/* Name row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs mb-1.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Nombre</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-all duration-200 font-sans-custom"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.85)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Apellido</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-all duration-200 font-sans-custom"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.85)' }}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs mb-1.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-all duration-200 font-sans-custom"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.85)' }}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs mb-1.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Teléfono</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+57 300 123 4567"
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-all duration-200 font-sans-custom"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.85)' }}
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs mb-1.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Rol</label>
                <select
                  value={editForm.roleId}
                  onChange={(e) => setEditForm((f) => ({ ...f, roleId: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-all duration-200 font-sans-custom"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.85)' }}
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
                  <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>Estado de la cuenta</p>
                  <p className="text-xs mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
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
            <div className="px-6 py-4 flex items-center justify-end gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={closeEdit}
                className="px-4 py-2 text-sm transition-colors font-sans-custom"
                style={{ color: 'rgba(242,240,237,0.5)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.8)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.5)'}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editForm.firstName || !editForm.lastName || !editForm.email || !editForm.roleId}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-sans-custom"
                style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400', borderRadius: '0.75rem' }}
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
